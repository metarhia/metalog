'use strict';

const fs = require('fs');
const events = require('events');
const common = require('@metarhia/common');
const { WritableFileStream } = require('metastreams');
const concolor = require('concolor');

const DAY_MILLISECONDS = common.duration('1d');
const HOUR_MILLISECONDS = common.duration('1h');

const LOG_TYPES = [
  'system',
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'access',
  'slow',
  'db',
];

const typeColor = concolor({
  system: 'b,white/blue',
  fatal: 'b,yellow/red',
  error: 'black/red',
  warn: 'black/yellow',
  info: 'blue/white',
  debug: 'black/green',
  access: 'black/white',
  slow: 'b,yellow/blue',
  db: 'b,white/green',
});

const textColor = concolor({
  system: 'b,white',
  fatal: 'b,red',
  error: 'red',
  warn: 'b,yellow',
  info: 'white',
  debug: 'b,green',
  access: 'white',
  slow: 'b,blue',
  db: 'green',
});

// Convert array to boolean flags
//   types <string[]>
// Returns: <Object>
const logTypes = types => {
  types = types || LOG_TYPES;
  const flags = {};
  let type;
  for (type of types) flags[type] = true;
  return flags;
};

const makeFileName = (path = '', node = 'N0', date = new Date()) => {
  const pad2 = n => (n < 10 ? '0' + n : '' + n);
  return `${path}/${date.getUTCFullYear()}-${pad2(
    date.getUTCMonth() + 1
  )}-${pad2(date.getUTCDate())}_${pad2(date.getUTCHours())}-${pad2(
    date.getUTCMinutes()
  )}_${node}.log`;
};

const normalizeStack = stack => stack.replace(/\s+at\s+/g, '\n\t');

const lineStack = stack => stack.replace(/[\n\r]\s*/g, '; ');

const pad = (s, len, char = ' ') => s + char.repeat(len - s.length);

// Logger wrapper to bind it to certain application
class ApplicationLogger {
  // logger <Logger>
  // application <string> name
  constructor(logger, application = 'default') {
    this.logger = logger;
    this.application = application;
  }

  system(message) {
    this.logger.write('system', message, this.application);
  }

  fatal(message) {
    const msg = normalizeStack(message);
    this.logger.write('fatal', msg, this.application);
  }

  error(message) {
    const msg = normalizeStack(message);
    this.logger.write('error', msg, this.application);
  }

  warn(message) {
    this.logger.write('warn', message, this.application);
  }

  info(message) {
    this.logger.write('info', message, this.application);
  }

  debug(message) {
    const msg = normalizeStack(message);
    this.logger.write('debug', msg, this.application);
  }

  access(message) {
    this.logger.write('access', message, this.application);
  }

  slow(message) {
    this.logger.write('slow', message, this.application);
  }

  db(message) {
    this.logger.write('db', message, this.application);
  }
}

class Logger extends events.EventEmitter {
  // path <string> log directory
  // node <string> nodeId
  // writeInterval <number> flush log to disk interval
  // writeBuffer <number> buffer size 64kb
  // keepDays <number> delete files after N days, 0 to disable
  // toFile <string[]> write log types to file
  // toStdout <string[]> write log types to stdout
  constructor(options) {
    super();
    const { path, node } = options;
    const { writeInterval, writeBuffer, keepDays } = options;
    const { toFile, toStdout } = options;
    this.active = false;
    this.path = path;
    this.node = node;
    this.writeInterval = writeInterval || 3000;
    this.writeBuffer = writeBuffer || 64 * 1024;
    this.keepDays = keepDays || 0;
    this.options = { flags: 'a', bufferSize: this.writeBuffer };
    this.stream = null;
    this.reopenTimer = null;
    this.flushTimer = null;
    this.lock = false;
    this.buffer = [];
    this.file = '';
    this.toFile = logTypes(toFile);
    this.fsEnabled = Object.keys(this.toFile).length !== 0;
    this.toStdout = logTypes(toStdout);
    this.open();
  }

  open() {
    if (this.active) return;
    this.active = true;
    if (!this.fsEnabled) {
      process.nextTick(() => this.emit('open'));
      return;
    }
    this.file = makeFileName(this.path, this.node);
    this.reopenTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close();
    }, HOUR_MILLISECONDS);
    if (this.keepDays) this.rotate();
    this.stream = new WritableFileStream(this.file, this.options);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.writeInterval);
    this.stream.on('open', () => {
      this.emit('open');
    });
    this.stream.on('error', () => {
      this.emit('error', new Error(`Can't open log file: ${this.file}`));
    });
  }

  close() {
    if (!this.active) {
      this.emit('close');
      return;
    }
    if (!this.fsEnabled) {
      this.active = false;
      this.emit('close');
      return;
    }
    const stream = this.stream;
    if (!stream || stream.destroyed || stream.closed) {
      this.emit('close');
      return;
    }
    this.flush(err => {
      if (err) {
        this.emit('close');
        return;
      }
      this.active = false;
      this.stream.end(() => {
        clearInterval(this.flushTimer);
        clearTimeout(this.reopenTimer);
        this.flushTimer = null;
        this.reopenTimer = null;
        const fileName = this.file;
        this.emit('close');
        fs.stat(fileName, (err, stats) => {
          if (err) {
            process.stdout.write(`${err}\n`);
            return;
          }
          if (stats.size > 0) return;
          fs.unlink(this.file, err => {
            process.stdout.write(`${err}\n`);
          });
        });
      });
    });
  }

  rotate() {
    if (!this.keepDays) return;
    fs.readdir(this.path, (err, files) => {
      if (err) {
        process.stdout.write(`${err}\n`);
        return;
      }
      const now = new Date();
      const date = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      );
      const time = date.getTime();
      let i, fileName, fileTime, fileAge;
      for (i in files) {
        fileName = files[i];
        fileTime = new Date(fileName.substring(0, 10)).getTime();
        fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS);
        if (fileAge > 1 && fileAge > this.keepDays - 1) {
          fs.unlink(this.path + '/' + fileName, err => {
            process.stdout.write(`${err}\n`);
          });
        }
      }
    });
  }

  write(type, message, application = 'default') {
    const date = new Date();
    if (this.toStdout[type]) {
      const normalColor = textColor[type];
      const markColor = typeColor[type];
      const time = normalColor(date.toTimeString().substring(0, 8));
      const mark = markColor(' ' + pad(type, 7));
      const msg = normalColor(`${this.node}/${application}  ${message}`);
      const line = `${time}  ${mark}  ${msg}`;
      process.stdout.write(`${line}\n`);
    }
    if (this.toFile[type]) {
      const time = date.toISOString();
      const multiline = /[\n\r]/g.test(message);
      const line = multiline ? lineStack(message) : message;
      const data = `${time} [${type}] ${this.node}/${application} ${line}\n`;
      const buffer = Buffer.from(data);
      this.buffer.push(buffer);
    }
  }

  flush(callback) {
    if (this.lock) {
      if (callback) this.once('unlocked', callback);
      return;
    }
    if (this.buffer.length === 0) {
      if (callback) callback();
      return;
    }
    if (!this.active) {
      if (callback)
        callback(new Error('Cannot flush log buffer: logger is not opened'));
      return;
    }
    this.lock = true;
    const buffer = Buffer.concat(this.buffer);
    this.buffer.length = 0;
    this.stream.write(buffer, () => {
      this.lock = false;
      this.emit('unlocked');
      if (callback) callback();
    });
  }

  bind(application) {
    return new ApplicationLogger(this, application);
  }
}

module.exports = args => new Logger(args);
