'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const events = require('events');
const metautil = require('metautil');

const DAY_MILLISECONDS = metautil.duration('1d');
const DATE_LEN = 'YYYY-MM-DD'.length;

const DEFAULT_WRITE_INTERVAL = metautil.duration('3s');
const DEFAULT_BUFFER_SIZE = 64 * 1024;
const DEFAULT_KEEP_DAYS = 1;

const getNextReopen = () => {
  const now = new Date();
  const curTime = now.getTime();
  const nextDate = now.setUTCHours(0, 0, 0, 0);
  return nextDate - curTime + DAY_MILLISECONDS;
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

const createDir = (path) => {
  return new Promise((resolve, reject) => {
    fs.access(path, (err) => {
      if (!err) resolve();
      fs.mkdir(path, { recursive: true }, (err) => {
        if (!err || err.code === 'EEXIST') {
          resolve();
          return;
        }
        const error = new Error(`Can not create directory: ${path}\n`);
        reject(error);
      });
    });
  });
};

class FsLogger extends events.EventEmitter {
  constructor(options) {
    super();
    const {
      path,
      workerId,
      createStream = fs.createWriteStream,
      writeInterval,
      writeBuffer,
      keepDays,
    } = options;

    this.path = path;
    this.workerId = `W${workerId}`;

    this.createStream = createStream;
    this.writeInterval = writeInterval || DEFAULT_WRITE_INTERVAL;
    this.writeBuffer = writeBuffer || DEFAULT_BUFFER_SIZE;
    this.keepDays = keepDays || DEFAULT_KEEP_DAYS;

    this.active = false;
    this.stream = null;
    this.reopenTimer = null;
    this.flushTimer = null;
    this.lock = false;
    this.buffer = [];
    this.file = '';
  }

  write(record) {
    const buffer = Buffer.from(record + '\n');
    this.buffer.push(buffer);
  }

  async open() {
    if (this.active) return;
    this.active = true;
    await createDir(this.path).catch((error) => this.emit(error));
    const fileName = metautil.nowDate() + '-' + this.workerId + '.log';
    this.file = path.join(this.path, fileName);
    const nextReopen = getNextReopen();
    this.reopenTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close().catch((error) => {
        process.stdout.write(`${error.stack}\n`);
        this.emit('error', error);
      });
    }, nextReopen);
    if (this.keepDays) await this.rotate();
    const options = { flags: 'a', bufferSize: this.writeBuffer };
    this.stream = this.createStream(this.file, options);
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
  }

  close() {
    if (!this.active) return Promise.resolve();
    const { stream } = this;
    if (!stream || stream.destroyed || stream.closed) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.flush((error) => {
        if (error) {
          reject(error);
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
          fs.stat(fileName, (err, stats) => {
            if (!err && stats.size === 0) {
              fsp.unlink(fileName).catch(() => {});
            }
            resolve();
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
        finish.push(fsp.unlink(path.join(this.path, fileName)));
      }
      await Promise.all(finish);
    } catch (error) {
      this.emit('error', error);
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
      const error = new Error('Cannot flush closed log buffer');
      this.emit('error', error);
      if (callback) callback(error);
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
}

module.exports = { FsLogger };
