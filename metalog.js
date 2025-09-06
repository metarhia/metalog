'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const util = require('node:util');
const EventEmitter = require('node:events');
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

class BufferedStream extends EventEmitter {
  #writable = null;
  #buffers = [];
  #size = 0;
  #threshold = DEFAULT_BUFFER_SIZE;
  #flashing = false;
  #flushTimer = null;
  #flushInterval = DEFAULT_WRITE_INTERVAL;

  constructor(options = {}) {
    super();
    const { stream, writeBuffer, flushInterval } = options;
    this.#writable = stream;
    if (writeBuffer) this.#threshold = writeBuffer;
    if (flushInterval) this.#flushInterval = flushInterval;
    if (stream) this.startFlushTimer();
  }

  startFlushTimer() {
    if (this.#flushTimer) return;
    this.#flushTimer = setInterval(() => {
      this.flush();
    }, this.#flushInterval);
  }

  stopFlushTimer() {
    if (this.#flushTimer) {
      clearInterval(this.#flushTimer);
      this.#flushTimer = null;
    }
  }

  write(buffer) {
    this.#buffers.push(buffer);
    this.#size += buffer.length;
    if (this.#size >= this.#threshold) this.flush();
  }

  flush(callback) {
    if (this.#flashing) {
      if (callback && this.#writable) {
        this.once('drain', callback);
      } else if (callback) {
        callback();
      }
      return;
    }
    if (this.#size === 0) {
      if (callback) callback();
      return;
    }
    if (!this.#writable || this.#writable.destroyed || this.#writable.closed) {
      if (callback) callback();
      return;
    }
    this.#flashing = true;
    const buffer = Buffer.concat(this.#buffers);
    this.#buffers.length = 0;
    this.#size = 0;
    this.#writable.write(buffer, (error) => {
      this.#flashing = false;
      this.emit('drain');
      if (callback) callback(error);
    });
  }

  async close() {
    this.stopFlushTimer();
    if (!this.#writable) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.flush((error) => {
        if (error) return void reject(error);
        this.#writable.end(resolve);
      });
    });
  }
}

class Formatter {
  #workerId = 'W0';
  #home = './';

  constructor(options = {}) {
    const { workerId, home } = options;
    if (workerId) this.#workerId = workerId;
    if (home) this.#home = home;
  }

  format(type, indent, args) {
    let line = util.format(...args);
    if (type === 'error' || type === 'debug') line = this.normalizeStack(line);
    return ' '.repeat(indent) + line;
  }

  formatPretty(type, indent, args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, args);
    const normalColor = TEXT_COLOR[type];
    const markColor = TYPE_COLOR[type];
    const time = normalColor(dateTime.substring(TIME_START, TIME_END));
    const id = normalColor(this.#workerId);
    const mark = markColor(type.padEnd(TYPE_LENGTH));
    const msg = normalColor(message);
    return `${time}  ${id}  ${mark}  ${msg}`;
  }

  formatFile(type, indent, args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, args);
    const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
    return `${dateTime} [${type}] ${msg}`;
  }

  formatJson(type, indent, args) {
    const json = {
      timestamp: new Date().toISOString(),
      workerId: this.#workerId,
      level: type,
      message: null,
    };
    if (metautil.isError(args[0])) {
      json.error = this.expandError(args[0]);
      args = args.slice(1);
    } else if (typeof args[0] === 'object') {
      Object.assign(json, args[0]);
      if (metautil.isError(json.error)) {
        json.error = this.expandError(json.error);
      }
      args = args.slice(1);
    }
    json.message = util.format(...args);
    return JSON.stringify(json);
  }

  normalizeStack(stack) {
    if (!stack) return 'No stack trace to log';
    let res = metautil.replace(stack, STACK_AT, '');
    if (this.#home) res = metautil.replace(res, this.#home, '');
    return res;
  }

  expandError(error) {
    return {
      message: error.message,
      stack: this.normalizeStack(error.stack),
      ...error,
    };
  }
}

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
  if (!fileName || fileName.length < DATE_LEN) {
    return NaN;
  }
  const date = fileName.substring(0, DATE_LEN);
  const [year, month, day] = date.split('-').map(Number);
  const fileDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const fileTime = fileDate.getTime();
  if (isNaN(fileTime)) {
    return NaN;
  }
  return Math.floor(fileTime / DAY_MILLISECONDS);
};

const getNextReopen = () => {
  const now = new Date();
  const curTime = now.getTime();
  const nextDate = now.setUTCHours(0, 0, 0, 0);
  return nextDate - curTime + DAY_MILLISECONDS;
};

class Console {
  #logger;
  #groupIndent = 0;
  #counts = new Map();
  #times = new Map();
  #readline = readline;

  constructor(logger) {
    this.#logger = logger;
  }

  assert(assertion, ...args) {
    if (!assertion) {
      const noArgs = args.length === 0;
      const message = noArgs ? 'Assertion failed' : util.format(...args);
      this.#logger.write('error', this.#groupIndent, [message]);
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
    this.#logger.write('debug', this.#groupIndent, [`${label}: ${cnt}`]);
  }

  countReset(label = 'default') {
    this.#counts.delete(label);
  }

  debug(...args) {
    this.#logger.write('debug', this.#groupIndent, args);
  }

  dir(obj, options) {
    const inspected = util.inspect(obj, options);
    this.#logger.write('debug', this.#groupIndent, [inspected]);
  }

  dirxml(...data) {
    this.#logger.write('debug', this.#groupIndent, data);
  }

  trace(...args) {
    const msg = util.format(...args);
    const err = new Error(msg);
    this.#logger.write('debug', this.#groupIndent, [`Trace${err.stack}`]);
  }

  info(...args) {
    this.#logger.write('info', this.#groupIndent, args);
  }

  log(...args) {
    this.#logger.write('log', this.#groupIndent, args);
  }

  warn(...args) {
    this.#logger.write('warn', this.#groupIndent, args);
  }

  error(...args) {
    this.#logger.write('error', this.#groupIndent, args);
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

  table(tabularData, properties) {
    const opts = { showHidden: false, depth: null, colors: false };
    let data = tabularData;
    if (properties) {
      if (!Array.isArray(data)) data = [data];
      data = data.map((item) => {
        const record = {};
        for (const prop of properties) {
          if (Object.prototype.hasOwnProperty.call(item, prop)) {
            record[prop] = item[prop];
          }
        }
        return record;
      });
    }
    this.#logger.write('log', 0, [util.inspect(data, opts)]);
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

  timeLog(label = 'default', ...data) {
    const startTime = this.#times.get(label);
    if (startTime === undefined) {
      const msg = `Warning: No such label '${label}'`;
      this.#logger.write('warn', this.#groupIndent, [msg]);
      return;
    }
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    const message = data.length > 0 ? util.format(...data) : '';
    const output = `${label}: ${totalTimeMs}ms${message ? ' ' + message : ''}`;
    this.#logger.write('debug', this.#groupIndent, [output]);
  }
}

class Logger extends EventEmitter {
  active = false;
  workerId = 'W0';
  #createStream = fs.createWriteStream;
  #writeInterval = DEFAULT_WRITE_INTERVAL;
  #writeBuffer = DEFAULT_BUFFER_SIZE;
  #keepDays = DEFAULT_KEEP_DAYS;
  #stream = null;
  #rotationTimer = null;
  #file = '';
  #fsEnabled = false;
  #json = false;
  #toFile = null;
  #toStdout = null;
  #buffer = null;
  #formatter = null;

  constructor(options) {
    super();
    const { workerId, createStream } = options;
    const { writeInterval, writeBuffer, keepDays, home, json, crash } = options;
    const { toFile = LOG_TYPES, toStdout = LOG_TYPES } = options;
    this.path = options.path;
    this.home = home;
    this.console = new Console(this);
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
    this.#buffer = null;
    this.#formatter = new Formatter({
      json: this.#json,
      workerId: this.workerId,
      home: this.home,
    });
    return this.open();
  }

  static async create(options) {
    return new Logger(options);
  }

  async open() {
    if (this.active) return this;
    this.active = true;
    if (!this.#fsEnabled) return this;
    await this.#createDir();
    const fileName = metautil.nowDate() + '-' + this.workerId + '.log';
    this.#file = path.join(this.path, fileName);
    const nextReopen = getNextReopen();
    this.#rotationTimer = setTimeout(() => {
      this.once('close', () => {
        this.open();
      });
      this.close().catch((error) => {
        this.emit('error', error);
      });
    }, nextReopen);
    if (this.#keepDays) await this.rotate();
    this.#stream = this.#createStream(this.#file, { flags: 'a' });
    this.#buffer = new BufferedStream({
      writeBuffer: this.#writeBuffer,
      stream: this.#stream,
      flushInterval: this.#writeInterval,
    });
    this.#stream.on('error', () => {
      const errorMsg = `Can't open log file: ${this.#file}`;
      this.emit('error', new Error(errorMsg));
    });
    await EventEmitter.once(this.#stream, 'open');
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
    if (!stream || stream.destroyed || stream.closed) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      this.flush((error) => {
        if (error) return void reject(error);
        clearTimeout(this.#rotationTimer);
        this.#rotationTimer = null;
        this.active = false;
        this.#buffer
          .close()
          .then(() => {
            const fileName = this.#file;
            this.emit('close');
            fs.stat(fileName, (error, stats) => {
              if (!error && stats.size === 0) {
                fsp.unlink(fileName).catch(() => {});
              }
              resolve();
            });
          })
          .catch(reject);
      });
    });
    return promise;
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
        const promise = fsp
          .unlink(path.join(this.path, fileName))
          .catch(() => {});
        finish.push(promise);
      }
      await Promise.all(finish);
    } catch (error) {
      process.stdout.write(`${error.stack}\n`);
      this.emit('error', error);
    }
  }

  #createDir() {
    return new Promise((resolve, reject) => {
      fs.access(this.path, (error) => {
        if (!error) resolve();
        fs.mkdir(this.path, (error) => {
          if (!error || error.code === 'EEXIST') {
            return void resolve();
          } else {
            const error = new Error(`Can not create directory: ${this.path}`);
            this.emit('error', error);
            reject(error);
          }
        });
      });
    });
  }

  write(type, indent, args) {
    const line = this.#json
      ? this.#formatter.formatJson(type, indent, args)
      : this.#formatter.formatPretty(type, indent, args);
    if (this.#toStdout[type]) {
      process.stdout.write(line + '\n');
    }
    if (this.#toFile[type]) {
      const buffer = Buffer.from(line + '\n');
      this.#buffer.write(buffer);
    }
  }

  flush(callback) {
    if (!this.active) {
      if (callback) callback();
      return;
    }
    if (!this.#buffer) {
      if (callback) callback();
      return;
    }
    this.#buffer.flush((error) => {
      if (error) this.emit('error', error);
      if (callback) callback(error);
    });
  }

  #setupCrashHandling() {
    const exitHandler = () => {
      if (this.active) this.flush();
    };
    process.on('SIGTERM', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('uncaughtException', exitHandler);
    process.on('unhandledRejection', exitHandler);
    process.on('exit', exitHandler);
  }
}

module.exports = {
  Logger,
  Console,
  BufferedStream,
  Formatter,
  nowDays,
  nameToDays,
};
