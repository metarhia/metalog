'use strict';

const fs = require('fs');
const util = require('util');
const events = require('events');
const common = require('metarhia-common');

const DAY_MILLISECONDS = common.duration('1d');

function Logger({
  path, // log directory
  nodeId, // nodeId
  writeInterval, // Flush log to disk interval
  writeBuffer, // Buffer size 64kb
  keepDays // Delete files after N days, 0 to disable
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
  this.corked = false;
  this.file = '';
  this.open();
}

util.inherits(Logger, events.EventEmitter);

Logger.prototype.open = function() {
  const date = common.nowDate();
  this.file = this.path + '/' + date + '-' + this.nodeId + '.log';
  const now = new Date();
  const nextDate = new Date();
  nextDate.setUTCHours(0, 0, 0, 0);
  const nextReopen = nextDate - now + DAY_MILLISECONDS;
  this.reopenTimer = setTimeout(this.open, nextReopen);
  this.stream = fs.createWriteStream(this.file, this.options);
  this.flushTimer = setInterval(this.fetch, this.writeInterval);
  this.stream.on('open', () => {
    this.active = true;
    this.emit('open');
  });
  this.stream.on('error', (err) => {
    this.emit('error', new Error('Can\'t open log file:' + this.file));
    throw err;
  });
  if (this.keepDays) this.rotate();
  return this;
};

Logger.prototype.close = function() {
  const stream = this.stream;
  if (!stream || stream.destroyed || stream.closed) return;
  this.stream.end(() => {
    this.active = false;
    clearInterval(this.flushTimer);
    clearTimeout(this.reopenTimer);
    this.emit('close');
    fs.stat(this.file, (err, stats) => {
      if (err || stats.size > 0) return;
      fs.unlink(this.file);
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

Logger.prototype.access = function(message) {
  this.write('[A]\t' + message);
};

Logger.prototype.write = function(message) {
  const data = new Date().toISOString() + '\t' + message + '\n';
  if (!this.corked) {
    this.corked = true;
    this.stream.cork();
  }
  const res = this.stream.write(data);
  if (!res) {
    this.corked = false;
    this.stream.uncork();
  }
};

Logger.prototype.fetch = function() {
  if (this.corked) {
    this.corked = false;
    this.stream.uncork();
  }
};

module.exports = (args) => new Logger(args);
