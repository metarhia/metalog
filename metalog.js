'use strict';

const fs = require('fs');
const util = require('util');
const events = require('events');
const common = require('@metarhia/common');
const concolor = require('concolor');

const DAY_MILLISECONDS = common.duration('1d');

const LOG_TYPES = [
  'system', 'fatal', 'error', 'warn', 'info', 'debug', 'access', 'slow'
];

const typeColor = concolor({
  system: 'b,white/blue',
  fatal: 'b,yellow/red',
  error: 'black/red',
  warn: 'black/yellow',
  info: 'blue/white',
  debug: 'black/green',
  access: 'black/white',
  slow: 'b,yellow/blue'
});

const textColor = concolor({
  system: 'b,white',
  fatal: 'b,red',
  error: 'red',
  warn: 'b,yellow',
  info: 'white',
  debug: 'b,green',
  access: 'white',
  slow: 'b,blue'
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

const normalizeStack = stack => stack.replace(/\s+at\s+/g, '\n\t');

const lineStack = stack => stack.replace(/[\n\r]\s*/g, '; ');

//const formatStack = stack => stack.replace(/; /g, '\n\t');

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

}

// Logger constructor
//   path <string> log directory
//   node <string> nodeId
//   writeInterval <number> flush log to disk interval
//   writeBuffer <number> buffer size 64kb
//   keepDays <number> delete files after N days, 0 to disable
//   toFile <string[]> write log types to file
//   toStdout <string[]> write log types to stdout
function Logger(options) {
  const { path, node } = options;
  const { writeInterval, writeBuffer, keepDays } = options;
  const { toFile, toStdout } = options;
  this.active = false;
  this.path = path;
  this.node = node;
  this.writeInterval = writeInterval || 3000;
  this.writeBuffer = writeBuffer || 64 * 1024;
  this.keepDays = keepDays || 0;
  this.options = { flags: 'a', highWaterMark: this.writeBuffer };
  this.stream = null;
  this.reopenTimer = null;
  this.flushTimer = null;
  this.lock = false;
  this.buffer = [];
  this.file = '';
  this.toFile = logTypes(toFile);
  this.toStdout = logTypes(toStdout);
  this.open();
}

util.inherits(Logger, events.EventEmitter);

Logger.prototype.open = function() {
  if (this.active) return;
  this.active = true;
  const date = common.nowDate();
  this.file = this.path + '/' + date + '-' + this.node + '.log';
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
  this.stream = fs.createWriteStream(this.file, this.options);
  this.flushTimer = setInterval(() => {
    this.flush();
  }, this.writeInterval);
  this.stream.on('open', () => {
    this.emit('open');
  });
  this.stream.on('error', () => {
    this.emit('error', new Error('Can\'t open log file:' + this.file));
  });
};

Logger.prototype.close = function() {
  if (!this.active) return;
  const stream = this.stream;
  if (!stream || stream.destroyed || stream.closed) return;
  this.flush((err) => {
    if (err) return;
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
          console.log(err);
          return;
        }
        if (stats.size > 0) return;
        fs.unlink(this.file, (err) => {
          console.log(err);
        });
      });
    });
  });
};

Logger.prototype.rotate = function() {
  if (!this.keepDays) return;
  fs.readdir(this.path, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }
    const now = new Date();
    const date = new Date(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
    );
    const time = date.getTime();
    let i, fileName, fileTime, fileAge;
    for (i in files) {
      fileName = files[i];
      fileTime = new Date(fileName.substring(0, 10)).getTime();
      fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS);
      if (fileAge > 1 && fileAge > this.keepDays - 1) {
        fs.unlink(this.path + '/' + fileName, (err) => {
          console.log(err);
        });
      }
    }
  });
};

Logger.prototype.write = function(type, message, application = 'default') {
  const date = new Date();
  if (this.toStdout[type]) {
    const normalColor = textColor[type];
    const markColor = typeColor[type];
    const time = normalColor(date.toTimeString().substring(0, 8));
    const mark = markColor(' ' + pad(type, 7));
    const msg = normalColor(`${this.node}/${application}  ${message}`);
    const line = `${time}  ${mark}  ${msg}`;
    console.log(line);
  }
  if (this.toFile[type]) {
    const time = date.toISOString();
    const multiline = (/[\n\r]/g).test(message);
    const line = multiline ? lineStack(message) : message;
    const data = `${time} [${type}] ${this.node}/${application} ${line}\n`;
    const buffer = Buffer.from(data);
    this.buffer.push(buffer);
  }
};

Logger.prototype.flush = function(callback) {
  if (!this.active || this.lock || !this.buffer.length) {
    if (callback) callback(new Error('Can\'t flush log buffer'));
    return;
  }
  this.lock = true;
  const buffer = Buffer.concat(this.buffer);
  this.buffer.length = 0;
  this.stream.write(buffer, (err) => {
    this.lock = false;
    if (callback) callback(err);
  });
};

Logger.prototype.bind = function(application) {
  return new ApplicationLogger(this, application);
};

module.exports = (args) => new Logger(args);
