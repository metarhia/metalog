'use strict';

const fs = require('fs');
const util = require('util');
const events = require('events');
const common = require('metarhia-common');
const concolor = require('concolor');

const DAY_MILLISECONDS = common.duration('1d');
const LOG_TYPES = [
  'system', 'fatal', 'error', 'warn', 'info', 'debug', 'slow'
];

const typeColor = concolor({
  system: 'white/blue',
  fatal: 'black/red',
  error: 'yellow/red',
  warn: 'black/yellow',
  info: 'blue/white',
  debug: 'black/green',
  slow: 'yellow/blue'
});

const textColor = concolor({
  system: 'b,blue',
  fatal: 'b,red',
  error: 'b,red',
  warn: 'b,yellow',
  info: 'b,green',
  debug: 'b,green',
  slow: 'b,blue'
});

const logTypes = (
  // Convert array to boolean flags
  types // Array of strings
  // Returns: hash of boolean
) => {
  types = types || LOG_TYPES;
  const flags = {};
  let type;
  for (type of types) flags[type] = true;
  return flags;
};

function Logger({
  path, // log directory
  nodeId, // nodeId
  writeInterval, // Flush log to disk interval
  writeBuffer, // Buffer size 64kb
  keepDays, // Delete files after N days, 0 to disable
  toFile, // Array of string, write log types to file
  stdout // Array of string, stdout log types
}) {
  this.active = false;
  this.path = path;
  this.nodeId = nodeId;
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
  this.stdout = logTypes(stdout);
  this.open();
}

util.inherits(Logger, events.EventEmitter);

Logger.prototype.open = function() {
  if (this.active) return;
  this.active = true;
  const date = common.nowDate();
  this.file = this.path + '/' + date + '-' + this.nodeId + '.log';
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
  this.stream.on('error', (err) => {
    this.emit('error', new Error('Can\'t open log file:' + this.file));
    throw err;
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

Logger.prototype.system = function(message) {
  this.write('system', message);
};

Logger.prototype.fatal = function(message) {
  this.write('fatal', message);
};

Logger.prototype.error = function(message) {
  this.write('error', message);
};

Logger.prototype.warn = function(message) {
  this.write('warn', message);
};

Logger.prototype.info = function(message) {
  this.write('info', message);
};

Logger.prototype.debug = function(message) {
  this.write('debug', message);
};

Logger.prototype.slow = function(message) {
  this.write('slow', message);
};

const pad = (s, len, char = ' ') => s + char.repeat(len - s.length);

Logger.prototype.write = function(type, message) {
  const date = new Date().toISOString();
  if (this.stdout[type]) {
    const line = (
      textColor[type](date) + '\t' +
      typeColor[type](' ' + pad(type, 7)) + '\t' +
      textColor[type](message)
    );
    console.log(line);
  }
  if (this.toFile[type]) {
    const line = date + '\t[' + type + ']\t' + message + '\n';
    const buffer = Buffer.from(line);
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
