'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const util = require('node:util');
const events = require('node:events');
const readline = require('node:readline');
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

const isError = (val) =>
  Object.prototype.toString.call(val) === '[object Error]';

class Console {
  constructor(write) {
    this._write = write;
    this._groupIndent = 0;
    this._counts = new Map();
    this._times = new Map();
  }

  assert(assertion, ...args) {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      this._write('error', this._groupIndent, err.stack);
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
    this._write('debug', this._groupIndent, `${label}: ${cnt}`);
  }

  countReset(label = 'default') {
    this._counts.delete(label);
  }

  debug(...args) {
    this._write('debug', this._groupIndent, ...args);
  }

  dir(...args) {
    this._write('debug', this._groupIndent, ...args);
  }

  trace(...args) {
    const msg = util.format(...args);
    const err = new Error(msg);
    this._write('debug', this._groupIndent, `Trace${err.stack}`);
  }

  info(...args) {
    this._write('info', this._groupIndent, ...args);
  }

  log(...args) {
    this._write('log', this._groupIndent, ...args);
  }

  warn(...args) {
    this._write('warn', this._groupIndent, ...args);
  }

  error(...args) {
    this._write('error', this._groupIndent, ...args);
  }

  group(...args) {
    if (args.length !== 0) this.log(...args);
    this._groupIndent += INDENT;
  }

  groupCollapsed(...args) {
    this.group(...args);
  }

  groupEnd() {
    if (this._groupIndent.length === 0) return;
    this._groupIndent -= INDENT;
  }

  table(tabularData) {
    this._write('log', 0, JSON.stringify(tabularData));
  }

  time(label = 'default') {
    this._times.set(label, process.hrtime());
  }

  timeEnd(label = 'default') {
    const startTime = this._times.get(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    this.timeLog(label, `${label}: ${totalTimeMs}ms`);
    this._times.delete(label);
  }

  timeLog(label, ...args) {
    const startTime = this._times.get(label);
    if (startTime === undefined) {
      const msg = `Warning: No such label '${label}'`;
      this._write('warn', this._groupIndent, msg);
      return;
    }
    this._write('debug', this._groupIndent, ...args);
  }
}

class Logger extends events.EventEmitter {
  constructor(args) {
    super();
    const { workerId = 0, createStream = fs.createWriteStream } = args;
    const { writeInterval, writeBuffer, keepDays, home, json } = args;
    const { toFile, toStdout } = args;
    this.active = false;
    this.path = args.path;
    this.workerId = `W${workerId}`;
    this.createStream = createStream;
    this.writeInterval = writeInterval || DEFAULT_WRITE_INTERVAL;
    this.writeBuffer = writeBuffer || DEFAULT_BUFFER_SIZE;
    this.keepDays = keepDays || DEFAULT_KEEP_DAYS;
    this.home = home;
    this.json = Boolean(json);
    this.stream = null;
    this.reopenTimer = null;
    this.flushTimer = null;
    this.lock = false;
    this.buffer = [];
    this.file = '';
    this.toFile = logTypes(toFile);
    this.fsEnabled = Object.keys(this.toFile).length !== 0;
    this.toStdout = logTypes(toStdout);
    this.console = new Console((...args) => this.write(...args));
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
          const error = new Error(`Can not create directory: ${this.path}\n`);
          this.emit('error', error);
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
      this.close().catch((err) => {
        process.stdout.write(`${err.stack}\n`);
        this.emit('error', err);
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
    } catch (err) {
      process.stdout.write(`${err.stack}\n`);
      this.emit('error', err);
    }
  }

  format(type, indent, ...args) {
    const normalize = type === 'error' || type === 'debug';
    const s = `${' '.repeat(indent)}${util.format(...args)}`;
    return normalize ? this.normalizeStack(s) : s;
  }

  formatPretty(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, ...args);
    const normalColor = TEXT_COLOR[type];
    const markColor = TYPE_COLOR[type];
    const time = normalColor(dateTime.substring(TIME_START, TIME_END));
    const id = normalColor(this.workerId);
    const mark = markColor(' ' + type.padEnd(TYPE_LENGTH));
    const msg = normalColor(message);
    return `${time}  ${id}  ${mark}  ${msg}`;
  }

  formatFile(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, ...args);
    const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
    return `${dateTime} [${type}] ${msg}`;
  }

  formatJson(type, indent, ...args) {
    const log = {
      timestamp: new Date().toISOString(),
      workerId: this.workerId,
      level: type,
      message: null,
    };
    if (isError(args[0])) {
      log.err = this.expandError(args[0]);
      args = args.slice(1);
    } else if (typeof args[0] === 'object') {
      Object.assign(log, args[0]);
      if (isError(log.err)) log.err = this.expandError(log.err);
      if (isError(log.error)) log.error = this.expandError(log.error);
      args = args.slice(1);
    }
    log.message = util.format(...args);
    return JSON.stringify(log);
  }

  write(type, indent, ...args) {
    if (this.toStdout[type]) {
      const line = this.json
        ? this.formatJson(type, indent, ...args)
        : this.formatPretty(type, indent, ...args);
      process.stdout.write(line + '\n');
    }
    if (this.toFile[type]) {
      const line = this.json
        ? this.formatJson(type, indent, ...args)
        : this.formatFile(type, indent, ...args);
      const buffer = Buffer.from(line + '\n');
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

  expandError(err) {
    return {
      message: err.message,
      stack: this.normalizeStack(err.stack),
      ...err,
    };
  }
}

const openLog = async (args) => new Logger(args);

module.exports = { Logger, openLog };
