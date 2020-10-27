'use strict';

const fs = require('fs');
const { sep } = require('path');
const events = require('events');
const common = require('@metarhia/common');
const { WritableFileStream } = require('metastreams');
const concolor = require('concolor');

const DAY_MILLISECONDS = common.duration('1d');

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
  for (const type of types) {
    flags[type] = true;
  }
  return flags;
};

const lineStack = stack => stack.replace(/[\n\r]\s*/g, '; ');

class Logger extends events.EventEmitter {
  // path <string> log directory
  // workerId <string> workwr process or thread id
  // writeInterval <number> flush log to disk interval
  // writeBuffer <number> buffer size 64kb
  // keepDays <number> delete files after N days, 0 to disable
  // toFile <string[]> write log types to file
  // toStdout <string[]> write log types to stdout
  // Writable <class> writable stream class
  // home <string> remove home paths from stack traces
  constructor(options) {
    super();
    const { path, workerId = 0, Writable = WritableFileStream } = options;
    const { writeInterval, writeBuffer, keepDays, home } = options;
    const { toFile, toStdout } = options;
    this.active = false;
    this.path = path;
    this.workerId = `W${workerId}`;
    this.Writable = Writable;
    this.writeInterval = writeInterval || 3000;
    this.writeBuffer = writeBuffer || 64 * 1024;
    this.keepDays = keepDays || 0;
    this.home = home ? new RegExp(common.escapeRegExp(home), 'g') : null;
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
    return this.open();
  }

  async open() {
    if (this.active) return this;
    this.active = true;
    if (!this.fsEnabled) {
      process.nextTick(() => this.emit('open'));
      return this;
    }
    const date = common.nowDate();
    this.file = this.path + sep + date + '-' + this.workerId + '.log';
    const now = new Date();
    const nextDate = new Date();
    nextDate.setUTCHours(0, 0, 0, 0);
    const nextReopen = nextDate - now + DAY_MILLISECONDS;
    this.reopenTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close();
    }, nextReopen);
    if (this.keepDays) this.rotate();
    this.stream = new this.Writable(this.file, this.options);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.writeInterval);
    this.stream.on('open', () => {
      this.emit('open');
    });
    this.stream.on('error', () => {
      this.emit('error', new Error(`Can't open log file: ${this.file}`));
    });
    await events.once(this, 'open');
    return this;
  }

  async close() {
    if (!this.active) return Promise.resolve();
    if (!this.fsEnabled) {
      this.active = false;
      this.emit('close');
      return Promise.resolve();
    }
    const { stream } = this;
    if (!stream || stream.destroyed || stream.closed) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.flush(err => {
        if (err) {
          process.stdout.write(`${err.stack}\n`);
          this.emit('error', err);
          reject(err);
          return;
        }
        this.active = false;
        stream.end(() => {
          clearInterval(this.flushTimer);
          clearTimeout(this.reopenTimer);
          this.flushTimer = null;
          this.reopenTimer = null;
          const fileName = this.file;
          this.emit('close');
          resolve();
          fs.stat(fileName, (err, stats) => {
            if (err) return;
            if (stats.size > 0) return;
            fs.unlink(this.file, () => {});
          });
        });
      });
    });
  }

  rotate() {
    if (!this.keepDays) return;
    fs.readdir(this.path, (err, files) => {
      if (err) {
        process.stdout.write(`${err.stack}\n`);
        this.emit('error', err);
        return;
      }
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const day = now.getUTCDate();
      const date = new Date(year, month, day, 0, 0, 0, 0);
      const time = date.getTime();
      for (const fileName of files) {
        const fileTime = new Date(fileName.substring(0, 10)).getTime();
        const fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS);
        if (fileAge > 1 && fileAge > this.keepDays - 1) {
          fs.unlink(this.path + sep + fileName, err => {
            if (err) {
              process.stdout.write(`${err.stack}\n`);
              this.emit('error', err);
            }
          });
        }
      }
    });
  }

  write(type, message) {
    const date = new Date();
    const dateTime = date.toISOString();
    if (this.toStdout[type]) {
      const normalColor = textColor[type];
      const markColor = typeColor[type];
      const time = normalColor(dateTime.substring(11, 19));
      const id = normalColor(this.workerId);
      const mark = markColor(' ' + type.padEnd(7));
      const msg = normalColor(message);
      const line = `${time}  ${id}  ${mark}  ${msg}\n`;
      process.stdout.write(line);
    }
    if (this.toFile[type]) {
      const msg = lineStack(message);
      const line = `${dateTime} [${type}] ${msg}\n`;
      const buffer = Buffer.from(line);
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
      const err = new Error('Cannot flush log buffer: logger is not opened');
      this.emit('error', err);
      if (callback) callback(err);
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

  normalizeStack(stack) {
    if (!stack) return 'no data to log';
    let res = stack.replace(/\s+at\s+/g, '\n\t');
    if (this.home) res = res.replace(this.home, '');
    return res;
  }

  system(message) {
    this.write('system', message);
  }

  fatal(message) {
    const msg = this.normalizeStack(message);
    this.write('fatal', msg);
  }

  error(message) {
    const msg = this.normalizeStack(message);
    this.write('error', msg);
  }

  warn(message) {
    this.write('warn', message);
  }

  info(message) {
    this.write('info', message);
  }

  debug(message) {
    const msg = this.normalizeStack(message);
    this.write('debug', msg);
  }

  access(message) {
    this.write('access', message);
  }

  slow(message) {
    this.write('slow', message);
  }

  db(message) {
    this.write('db', message);
  }
}

const openLog = async args => new Logger(args);

module.exports = { Logger, openLog };
