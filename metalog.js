'use strict';

const fs = require('fs');
const util = require('util');
const events = require('events');
const common = require('metarhia-common');

const DAY_MILLISECONDS = common.duration('1d');

function Logger(
  path, // log directory
  nodeId, // nodeId
  writeInterval = 3000, // Flush log to disk interval
  writeBuffer = 64 * 1024, // Buffer size 64kb
  keepDays = 100 // Delete files after N days, 0 to disable
) {
  this.active = false;
  this.path = path;
  this.nodeId = nodeId;
  this.keepDays = keepDays;
  this.writeInterval = writeInterval;
  this.writeBuffer = writeBuffer;
  this.options = { flags: 'a', highWaterMark: this.writeBuffer };
  this.stream = null;
  this.reopenTimer = null;
  this.flushTimer = null;
  this.lock = false;
  this.buffer = [];
  this.file = '';
}

util.inherits(Logger, events.EventEmitter);

Logger.prototype.open = function(callback) {
  const date = common.nowDate();
  this.file = this.path + '/' + date + '-' + this.nodeId + '.log';
  const now = new Date();
  const nextDate = new Date();
  nextDate.setUTCHours(0, 0, 0, 0);
  const nextReopen = nextDate - now + DAY_MILLISECONDS;
  this.reopenTimer = setTimeout(this.open, nextReopen);
  if (this.keepDays) this.rotate();
  this.stream = fs.createWriteStream(this.file, this.options);
  this.flushTimer = setInterval(() => {
    this.flush();
  }, this.writeInterval);
  this.stream.on('open', () => {
    this.active = true;
    callback();
  });
  this.stream.on('error', callback);
};

Logger.prototype.close = function(callback) {
  this.flush(() => {
    if (this.stream.destroyed || this.stream.closed) return;
    this.stream.end(() => {
      this.active = false;
      clearInterval(this.flushTimer);
      clearTimeout(this.reopenTimer);
      fs.stat(this.file, (err, stats) => {
        if (err || stats.size > 0) {
          callback(err);
          return;
        }
        fs.unlink(this.file, callback);
      });
    });
  });
};

Logger.prototype.rotate = function() {
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
      if (fileAge > 1 && fileAge > this.keepDays) {
        fs.unlink(this.path + '/' + fileName, common.emptiness);
      }
    }
  });
};

Logger.prototype.system = function(message) {
  this.write('[S]\t' + message);
};

Logger.prototype.error = function(message) {
  this.write('[E]\t' + message);
};

Logger.prototype.warn = function(message) {
  this.write('[W]\t' + message);
};

Logger.prototype.info = function(message) {
  this.write('[I]\t' + message);
};

Logger.prototype.debug = function(message) {
  this.write('[D]\t' + message);
};

Logger.prototype.write = function(message) {
  const data = new Date().toISOString() + '\t' + message + '\n';
  const buffer = Buffer.from(data);
  this.buffer.push(buffer);
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

module.exports = (...args) => new Logger(...args);
