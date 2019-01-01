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

// Logger constructor
//   path <string> log directory
//   node <string> nodeId
//   app <string> application name
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
        if (err || stats.size > 0) return;
        fs.unlink(this.file, () => {});
      });
    });
  });
};

Logger.prototype.rotate = function() {
  if (!this.keepDays) return;
  fs.readdir(this.path, (err, files) => {
    if (err) return;
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
        fs.unlink(this.path + '/' + fileName, common.emptiness);
      }
    }
  });
};

Logger.normalizeStack = (stack) => stack.replace(/\s+at\s+/g, '\n\t');

Logger.lineStack = (stack) => stack.replace(/[\n\r]\s*/g, '; ');

Logger.formatStack = (stack) => stack.replace(/; /g, '\n\t');


Logger.prototype.system = function(message, application) {
  this.write('system', message, application);
};

Logger.prototype.fatal = function(message, application) {
  this.write('fatal', Logger.normalizeStack(message), application);
};

Logger.prototype.error = function(message, application) {
  this.write('error', Logger.normalizeStack(message), application);
};

Logger.prototype.warn = function(message, application) {
  this.write('warn', message, application);
};

Logger.prototype.info = function(message, application) {
  this.write('info', message, application);
};

Logger.prototype.debug = function(message, application) {
  this.write('debug', Logger.normalizeStack(message), application);
};

Logger.prototype.access = function(message, application) {
  this.write('access', message, application);
};

Logger.prototype.slow = function(message, application) {
  this.write('slow', message, application);
};

const pad = (s, len, char = ' ') => s + char.repeat(len - s.length);

Logger.prototype.write = function(type, message, application = 'application') {
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
    const line = multiline ? Logger.lineStack(message) : message;
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

module.exports = (args) => new Logger(args);
