'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const events = require('node:events');
const metautil = require('metautil');

const DAY_MILLISECONDS = metautil.duration('1d');
const DATE_LEN = 'YYYY-MM-DD'.length;
const DEFAULT_WRITE_INTERVAL = metautil.duration('3s');
const DEFAULT_BUFFER_SIZE = 64 * 1024;
const DEFAULT_KEEP_DAYS = 1;

const createLogDir = (dir) => {
  return new Promise((resolve, reject) => {
    fs.access(dir, (err) => {
      if (!err) resolve();
      fs.mkdir(dir, (err) => {
        if (!err || err.code === 'EEXIST') {
          resolve();
          return;
        }
        const error = new Error(`Can not create directory: ${dir}\n`);
        reject(error);
      });
    });
  });
};

const nowDays = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const date = new Date(year, month, day, 0, 0, 0, 0);
  return Math.floor(date.getTime() / DAY_MILLISECONDS);
};

const nameToDays = (fileName) => {
  const date = fileName.substring(0, DATE_LEN);
  const fileTime = new Date(date).getTime();
  return Math.floor(fileTime / DAY_MILLISECONDS);
};

class FsTarget {
  #logger;

  constructor(logger) {
    this.#logger = logger;
    const { writeInterval, writeBuffer, keepDays } = logger.options;
    this.path = logger.options.path || fs.createWriteStream;
    this.createStream = logger.options.createStream || fs.createWriteStream;
    this.writeInterval = writeInterval || DEFAULT_WRITE_INTERVAL;
    this.writeBuffer = writeBuffer || DEFAULT_BUFFER_SIZE;
    this.keepDays = keepDays || DEFAULT_KEEP_DAYS;
    this.stream = null;
    this.flushTimer = null;
    this.lock = [];
    this.buffer = [];
    this.file = '';
    return this.open();
  }

  async open() {
    await createLogDir(this.path);
    const { workerId } = this.#logger;
    const now = metautil.nowDate();
    this.file = path.join(this.path, `${now}-${workerId}.log`);
    if (this.keepDays) await this.rotate();
    const options = { flags: 'a', bufferSize: this.writeBuffer };
    this.stream = this.createStream(this.file, options);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.writeInterval);
    try {
      await events.once(this.stream, 'open');
    } catch {
      throw new Error(`Can't open log file: ${this.file}`);
    }
    return this;
  }

  async close() {
    const { stream } = this;
    if (!stream || stream.destroyed || stream.closed) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.flush((err) => {
        if (err) {
          reject(err);
          return;
        }
        stream.end(() => {
          clearInterval(this.flushTimer);
          this.flushTimer = null;
          const fileName = this.file;
          fs.stat(fileName, (err, stats) => {
            if (err || stats.size > 0) {
              resolve();
              return;
            }
            //fsp.unlink(fileName).then(resolve, reject);
          });
        });
      });
    });
  }

  async rotate() {
    if (!this.keepDays) return;
    const now = nowDays();
    const finish = [];
    try {
      const files = await fsp.readdir(this.path);
      for (const fileName of files) {
        if (metautil.fileExt(fileName) !== 'log') continue;
        const fileAge = now - nameToDays(fileName);
        if (fileAge < this.keepDays) continue;
        //finish.push(fsp.unlink(path.join(this.path, fileName)));
      }
      await Promise.all(finish);
    } catch (err) {
      process.stdout.write(`${err.stack}\n`);
      this.#logger.emit('error', err);
    }
  }

  write(line) {
    const buffer = Buffer.from(line);
    this.buffer.push(buffer);
  }

  flush(callback) {
    if (this.lock.length > 0) {
      if (callback) this.lock.push(callback);
      return;
    }
    if (this.buffer.length === 0) {
      if (callback) callback();
      return;
    }
    if (!this.#logger.active) {
      const err = new Error('Cannot flush log buffer: logger is not opened');
      this.#logger.emit('error', err);
      if (callback) callback(err);
      return;
    }
    this.lock.push(callback);
    const buffer = Buffer.concat(this.buffer);
    this.buffer.length = 0;
    this.stream.write(buffer, () => {
      const callbacks = this.lock;
      this.lock = [];
      for (const callback of callbacks) callback();
    });
  }
}

module.exports = { FsTarget };
