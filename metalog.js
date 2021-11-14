'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const util = require('util');
const events = require('events');
const readline = require('readline');
const metautil = require('metautil');
const concolor = require('concolor');

const DAY_MILLISECONDS = metautil.duration('1d');
const DEFAULT_WRITE_INTERVAL = metautil.duration('3s');
const DEFAULT_BUFFER_SIZE = 64 * 1024;
const DEFAULT_KEEP_DAYS = 1;
const STACK_AT = '  at ';
const TYPE_LENGTH = 6;
const LINE_SEPARATOR = ';';
const INDENT = 2;
const DATE_LEN = 'YYYY-MM-DD'.length;
const TIME_START = DATE_LEN + 1;
const TIME_END = TIME_START + 'HH:MM:SS'.length;

const LOG_TYPES = ['log', 'info', 'warn', 'debug', 'error'];

const TYPE_COLOR = concolor({
  log: 'b,black/white',
  info: 'b,white/blue',
  warn: 'b,black/yellow',
  debug: 'b,white/green',
  error: 'b,yellow/red',
});

const TEXT_COLOR = concolor({
  log: 'white',
  info: 'white',
  warn: 'b,yellow',
  debug: 'b,green',
  error: 'red',
});

const DEFAULT_FLAGS = {
  log: false,
  info: false,
  warn: false,
  debug: false,
  error: false,
};

const logTypes = (types = LOG_TYPES) => {
  const flags = { ...DEFAULT_FLAGS };
  for (const type of types) {
    flags[type] = true;
  }
  return flags;
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

const getNextReopen = () => {
  const now = new Date();
  const curTime = now.getTime();
  const nextDate = now.setUTCHours(0, 0, 0, 0);
  return nextDate - curTime + DAY_MILLISECONDS;
};

class Console {
  constructor(write) {
    this._write = write;
    this._groupIndent = '';
    this._counts = new Map();
    this._times = new Map();
  }

  assert(assertion, ...args) {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      this._write('error', `${this._groupIndent}${err.stack}`);
    }
  }

  clear() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  }

  count(label = 'default') {
    let cnt = this._counts.get(label) || 0;
    cnt++;
    this._counts.set(label, cnt);
    this._write('debug', `${this._groupIndent}${label}: ${cnt}`);
  }

  countReset(label = 'default') {
    this._counts.delete(label);
  }

  debug(...args) {
    const msg = util.format(...args);
    this._write('debug', `${this._groupIndent}${msg}`);
  }

  dir(...args) {
    const msg = util.inspect(...args);
    this._write('debug', `${this._groupIndent}${msg}`);
  }

  error(...args) {
    const msg = util.format(...args);
    this._write('error', `${this._groupIndent}${msg}`);
  }

  group(...args) {
    if (args.length !== 0) this.log(...args);
    this._groupIndent = ' '.repeat(this._groupIndent.length + INDENT);
  }

  groupCollapsed(...args) {
    this.group(...args);
  }

  groupEnd() {
    if (this._groupIndent.length === 0) return;
    this._groupIndent = ' '.repeat(this._groupIndent.length - INDENT);
  }

  info(...args) {
    const msg = util.format(...args);
    this._write('info', `${this._groupIndent}${msg}`);
  }

  log(...args) {
    const msg = util.format(...args);
    this._write('log', `${this._groupIndent}${msg}`);
  }

  table(tabularData) {
    this._write('log', JSON.stringify(tabularData));
  }

  time(label = 'default') {
    this._times.set(label, process.hrtime());
  }

  timeEnd(label = 'default') {
    const startTime = this._times.get(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    const msg = `${this._groupIndent}${label}: ${totalTimeMs}ms`;
    this.timeLog(label, msg);
    this._times.delete(label);
  }

  timeLog(label, ...args) {
    const startTime = this._times.get(label);
    if (startTime === undefined) {
      const msg = `${this._groupIndent}Warning: No such label '${label}'`;
      this._write('warn', msg);
      return;
    }
    const msg = util.format(...args);
    this._write('debug', msg);
  }

  trace(...args) {
    const msg = util.format(...args);
    const err = new Error(msg);
    this._write('debug', `${this._groupIndent}Trace${err.stack}`);
  }

  warn(...args) {
    const msg = util.format(...args);
    this._write('warn', `${this._groupIndent}${msg}`);
  }
}

class Logger extends events.EventEmitter {
  constructor(args) {
    super();
    const { workerId = 0, createStream = fs.createWriteStream } = args;
    const { writeInterval, writeBuffer, keepDays, home } = args;
    const { toFile, toStdout } = args;
    this.active = false;
    this.path = args.path;
    this.workerId = `W${workerId}`;
    this.createStream = createStream;
    this.writeInterval = writeInterval || DEFAULT_WRITE_INTERVAL;
    this.writeBuffer = writeBuffer || DEFAULT_BUFFER_SIZE;
    this.keepDays = keepDays || DEFAULT_KEEP_DAYS;
    this.home = home;
    this.stream = null;
    this.reopenTimer = null;
    this.flushTimer = null;
    this.lock = false;
    this.buffer = [];
    this.file = '';
    this.toFile = logTypes(toFile);
    this.fsEnabled = Object.keys(this.toFile).length !== 0;
    this.toStdout = logTypes(toStdout);
    this.console = new Console((type, message) => this.write(type, message));
    return this.open();
  }

  createLogDir() {
    return new Promise((resolve, reject) => {
      fs.access(this.path, (err) => {
        if (!err) resolve();
        fs.mkdir(this.path, (err) => {
          if (!err || err.code === 'EEXIST') {
            resolve();
            return;
          }
          this.emit(new Error(`Can not create directory: ${this.path}\n`));
          reject();
        });
      });
    });
  }

  async open() {
    if (this.active) return this;
    this.active = true;
    if (!this.fsEnabled) {
      process.nextTick(() => this.emit('open'));
      return this;
    }
    await this.createLogDir();
    const fileName = metautil.nowDate() + '-' + this.workerId + '.log';
    this.file = path.join(this.path, fileName);
    const nextReopen = getNextReopen();
    this.reopenTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close();
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
      this.flush((err) => {
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
            if (!err && stats.size === 0) {
              fsp.unlink(fileName).catch(() => {});
            }
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
    } catch (err) {
      process.stdout.write(`${err.stack}\n`);
      this.emit('error', err);
    }
  }

  write(type, s) {
    const date = new Date();
    const dateTime = date.toISOString();
    const normalize = type === 'error' || type === 'debug';
    const message = normalize ? this.normalizeStack(s) : s;
    if (this.toStdout[type]) {
      const normalColor = TEXT_COLOR[type];
      const markColor = TYPE_COLOR[type];
      const time = normalColor(dateTime.substring(TIME_START, TIME_END));
      const id = normalColor(this.workerId);
      const mark = markColor(' ' + type.padEnd(TYPE_LENGTH));
      const msg = normalColor(message);
      const line = `${time}  ${id}  ${mark}  ${msg}\n`;
      process.stdout.write(line);
    }
    if (this.toFile[type]) {
      const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
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
    let res = metautil.replace(stack, STACK_AT, '');
    if (this.home) res = metautil.replace(res, this.home, '');
    return res;
  }
}

const openLog = async (args) => new Logger(args);

module.exports = { Logger, openLog };
