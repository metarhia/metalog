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

const logTypes = (types) => {
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
  #write;
  #groupIndent = 0;
  #counts = new Map();
  #times = new Map();
  #readline = readline;

  constructor(write) {
    this.#write = write;
  }

  assert(assertion, ...args) {
    if (!assertion) {
      const noArgs = args.length === 0;
      const message = noArgs ? 'Assertion failed' : util.format(...args);
      this.#write('error', this.#groupIndent, message);
    }
  }

  clear() {
    this.#readline.cursorTo(process.stdout, 0, 0);
    this.#readline.clearScreenDown(process.stdout);
  }

  count(label = 'default') {
    let cnt = this.#counts.get(label) || 0;
    cnt++;
    this.#counts.set(label, cnt);
    this.#write('debug', this.#groupIndent, `${label}: ${cnt}`);
  }

  countReset(label = 'default') {
    this.#counts.delete(label);
  }

  debug(...args) {
    this.#write('debug', this.#groupIndent, ...args);
  }

  dir(...args) {
    this.#write('debug', this.#groupIndent, ...args);
  }

  trace(...args) {
    const msg = util.format(...args);
    const err = new Error(msg);
    this.#write('debug', this.#groupIndent, `Trace${err.stack}`);
  }

  info(...args) {
    this.#write('info', this.#groupIndent, ...args);
  }

  log(...args) {
    this.#write('log', this.#groupIndent, ...args);
  }

  warn(...args) {
    this.#write('warn', this.#groupIndent, ...args);
  }

  error(...args) {
    this.#write('error', this.#groupIndent, ...args);
  }

  group(...args) {
    if (args.length !== 0) this.log(...args);
    this.#groupIndent += INDENT;
  }

  groupCollapsed(...args) {
    this.group(...args);
  }

  groupEnd() {
    if (this.#groupIndent === 0) return;
    this.#groupIndent -= INDENT;
  }

  table(tabularData) {
    this.#write('log', 0, JSON.stringify(tabularData));
  }

  time(label = 'default') {
    this.#times.set(label, process.hrtime());
  }

  timeEnd(label = 'default') {
    const startTime = this.#times.get(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    this.timeLog(label, `${label}: ${totalTimeMs}ms`);
    this.#times.delete(label);
  }

  timeLog(label, ...args) {
    const startTime = this.#times.get(label);
    if (startTime === undefined) {
      const msg = `Warning: No such label '${label}'`;
      this.#write('warn', this.#groupIndent, msg);
      return;
    }
    this.#write('debug', this.#groupIndent, ...args);
  }
}

class Logger extends events.EventEmitter {
  active = false;
  workerId = 'W0';
  #createStream = fs.createWriteStream;
  #writeInterval = DEFAULT_WRITE_INTERVAL;
  #writeBuffer = DEFAULT_BUFFER_SIZE;
  #keepDays = DEFAULT_KEEP_DAYS;
  #stream = null;
  #rotationTimer = null;
  #flushTimer = null;
  #flashing = false;
  #buffers = [];
  #bufferedBytes = 0;
  #file = '';
  #fsEnabled = false;
  #json = false;
  #toFile = null;
  #toStdout = null;

  constructor(options) {
    super();
    const { workerId, createStream } = options;
    const { writeInterval, writeBuffer, keepDays, home, json, crash } = options;
    const { toFile = LOG_TYPES, toStdout = LOG_TYPES } = options;
    this.path = options.path;
    this.home = home;
    this.console = new Console((...args) => this.write(...args));
    if (workerId) this.workerId = `W${workerId}`;
    if (json) this.#json = true;
    if (toFile) this.#toFile = logTypes(toFile);
    if (toStdout) this.#toStdout = logTypes(toStdout);
    if (createStream) this.#createStream = createStream;
    if (writeInterval) this.#writeInterval = writeInterval;
    if (writeBuffer) this.#writeBuffer = writeBuffer;
    if (keepDays) this.#keepDays = keepDays;
    if (crash === 'flush') this.#setupCrashHandling();
    this.#fsEnabled = toFile.length !== 0;
    return this.open();
  }

  static async create(options) {
    return new Logger(options);
  }

  get json() {
    return this.#json;
  }

  async open() {
    if (this.active) return this;
    this.active = true;
    if (!this.#fsEnabled) {
      process.nextTick(() => this.emit('open'));
      return this;
    }
    await this.#createLogDir();
    const fileName = metautil.nowDate() + '-' + this.workerId + '.log';
    this.#file = path.join(this.path, fileName);
    const nextReopen = getNextReopen();
    this.#rotationTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close().catch((err) => {
        process.stdout.write(`${err.stack}\n`);
        this.emit('error', err);
      });
    }, nextReopen);
    if (this.#keepDays) await this.rotate();
    this.#stream = this.#createStream(this.#file, { flags: 'a' });
    this.#flushTimer = setInterval(() => {
      this.flush();
    }, this.#writeInterval);
    this.#stream.on('open', () => {
      this.emit('open');
    });
    this.#stream.on('error', () => {
      const errorMsg = `Can't open log file: ${this.#file}`;
      this.emit('error', new Error(errorMsg));
    });
    await events.once(this, 'open');
    return this;
  }

  async close() {
    if (!this.active) return Promise.resolve();
    if (!this.#fsEnabled) {
      this.active = false;
      this.emit('close');
      return Promise.resolve();
    }
    const stream = this.#stream;
    if (!stream || stream.destroyed || stream.closed) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.flush((err) => {
        if (err) return void reject(err);
        this.active = false;
        this.#stream.end(() => {
          clearInterval(this.#flushTimer);
          clearTimeout(this.#rotationTimer);
          this.#flushTimer = null;
          this.#rotationTimer = null;
          const fileName = this.#file;
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

  createLogDir() {
    return new Promise((resolve, reject) => {
      fs.access(this.path, (err) => {
        if (!err) resolve();
        fs.mkdir(this.path, (err) => {
          if (!err || err.code === 'EEXIST') return void resolve();
          const error = new Error(`Can not create directory: ${this.path}\n`);
          this.emit('error', error);
          reject();
        });
      });
    });
  }

  async rotate() {
    if (!this.#keepDays) return;
    const now = nowDays();
    const finish = [];
    try {
      const files = await fsp.readdir(this.path);
      for (const fileName of files) {
        if (metautil.fileExt(fileName) !== 'log') continue;
        const fileAge = now - nameToDays(fileName);
        if (fileAge < this.#keepDays) continue;
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
    if (metautil.isError(args[0])) {
      log.err = this.expandError(args[0]);
      args = args.slice(1);
    } else if (typeof args[0] === 'object') {
      Object.assign(log, args[0]);
      if (metautil.isError(log.err)) log.err = this.expandError(log.err);
      if (metautil.isError(log.error)) log.error = this.expandError(log.error);
      args = args.slice(1);
    }
    log.message = util.format(...args);
    return JSON.stringify(log);
  }

  #createLogDir() {
    return new Promise((resolve, reject) => {
      fs.access(this.path, (err) => {
        if (!err) resolve();
        fs.mkdir(this.path, (err) => {
          if (!err || err.code === 'EEXIST') return void resolve();
          const error = new Error(`Can not create directory: ${this.path}\n`);
          this.emit('error', error);
          reject();
        });
      });
    });
  }

  write(type, indent, ...args) {
    if (this.#toStdout[type]) {
      const line = this.#json
        ? this.#formatJson(type, indent, ...args)
        : this.#formatPretty(type, indent, ...args);
      process.stdout.write(line + '\n');
    }
    if (this.#toFile[type]) {
      const line = this.#json
        ? this.#formatJson(type, indent, ...args)
        : this.#formatFile(type, indent, ...args);
      const buffer = Buffer.from(line + '\n');
      this.#buffers.push(buffer);
      this.#bufferedBytes += buffer.length;
      if (this.#bufferedBytes >= this.#writeBuffer) this.flush();
    }
  }

  flush(callback) {
    if (this.#flashing) {
      if (callback) this.once('unlocked', callback);
      return;
    }
    if (this.#bufferedBytes === 0) {
      if (callback) callback();
      return;
    }
    if (!this.active) {
      const err = new Error('Cannot flush log buffer: logger is not active');
      this.emit('error', err);
      if (callback) callback(err);
      return;
    }
    const stream = this.#stream;
    if (!stream || stream.destroyed || stream.closed) {
      const err = new Error('Cannot flush log buffer: stream is not available');
      this.emit('error', err);
      if (callback) callback(err);
      return;
    }
    this.#flashing = true;
    const buffer = Buffer.concat(this.#buffers);
    this.#buffers.length = 0;
    this.#bufferedBytes = 0;
    this.#stream.write(buffer, () => {
      this.#flashing = false;
      this.emit('unlocked');
      if (callback) callback();
    });
  }

  #format(type, indent, ...args) {
    const normalize = type === 'error' || type === 'debug';
    const s = `${' '.repeat(indent)}${util.format(...args)}`;
    return normalize ? this.#normalizeStack(s) : s;
  }

  #formatPretty(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.#format(type, indent, ...args);
    const normalColor = TEXT_COLOR[type];
    const markColor = TYPE_COLOR[type];
    const time = normalColor(dateTime.substring(TIME_START, TIME_END));
    const id = normalColor(this.workerId);
    const mark = markColor(' ' + type.padEnd(TYPE_LENGTH));
    const msg = normalColor(message);
    return `${time}  ${id}  ${mark}  ${msg}`;
  }

  #formatFile(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.#format(type, indent, ...args);
    const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
    return `${dateTime} [${type}] ${msg}`;
  }

  #formatJson(type, indent, ...args) {
    const log = {
      timestamp: new Date().toISOString(),
      workerId: this.workerId,
      level: type,
      message: null,
    };
    if (metautil.isError(args[0])) {
      log.err = this.#expandError(args[0]);
      args = args.slice(1);
    } else if (typeof args[0] === 'object') {
      Object.assign(log, args[0]);
      if (metautil.isError(log.err)) log.err = this.#expandError(log.err);
      if (metautil.isError(log.error)) log.error = this.#expandError(log.error);
      args = args.slice(1);
    }
    log.message = util.format(...args);
    return JSON.stringify(log);
  }

  #normalizeStack(stack) {
    if (!stack) return 'no data to log';
    let res = metautil.replace(stack, STACK_AT, '');
    if (this.home) res = metautil.replace(res, this.home, '');
    return res;
  }

  #expandError(err) {
    return {
      message: err.message,
      stack: this.#normalizeStack(err.stack),
      ...err,
    };
  }

  #setupCrashHandling() {
    const exitHandler = () => {
      this.flush();
    };
    process.on('SIGTERM', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('uncaughtException', (err) => {
      this.write('error', 0, 'Uncaught Exception:', err);
      this.flush();
    });
    process.on('unhandledRejection', (reason) => {
      this.write('error', 0, 'Unhandled Rejection:', reason);
      this.flush();
    });
    process.on('exit', () => {
      this.flush();
    });
  }
}

module.exports = { Logger };
