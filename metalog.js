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
const DEFAULT_FLUSH_INTERVAL = metautil.duration('3s');
const DEFAULT_BUFFER_THRESHOLD = 64 * 1024;
const DEFAULT_KEEP_DAYS = 1;
const STACK_AT = '  at ';
const TAG_LENGTH = 6;
const LINE_SEPARATOR = ';';
const INDENT = 2;
const DATE_LEN = 'YYYY-MM-DD'.length;
const TIME_START = DATE_LEN + 1;
const TIME_END = TIME_START + 'HH:MM:SS'.length;

const LOG_TAGS = ['log', 'info', 'warn', 'debug', 'error'];

const TAG_COLOR = concolor({
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

const logTags = (tags) => {
  const flags = { ...DEFAULT_FLAGS };
  for (const tag of tags) flags[tag] = true;
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

const nameToDays = (fileName = '') => {
  if (fileName.length < DATE_LEN) {
    throw new Error(`Invalid filename: ${fileName}`);
  }
  const date = fileName.substring(0, DATE_LEN);
  const [year, month, day] = date.split('-').map(Number);
  const fileDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const fileTime = fileDate.getTime();
  if (isNaN(fileTime)) {
    throw new Error(`Invalid filename: ${fileName}`);
  }
  return Math.floor(fileTime / DAY_MILLISECONDS);
};

const getNextReopen = () => {
  const now = new Date();
  const curTime = now.getTime();
  const nextDate = now.setUTCHours(0, 0, 0, 0);
  return nextDate - curTime + DAY_MILLISECONDS;
};

class BufferedStream extends EventEmitter {
  #writable = null;
  #buffers = [];
  #size = 0;
  #threshold = DEFAULT_BUFFER_THRESHOLD;
  #flushing = false;
  #flushTimer = null;

  constructor(options = {}) {
    super();
    const { stream, writeBuffer, flushInterval } = options;
    if (!stream) throw new Error('Stream is required');
    this.#writable = stream;
    if (writeBuffer) this.#threshold = writeBuffer;
    const interval = flushInterval || DEFAULT_FLUSH_INTERVAL;
    this.#flushTimer = setInterval(() => void this.flush(), interval);
  }

  write(buffer) {
    this.#buffers.push(buffer);
    this.#size += buffer.length;
    if (this.#size >= this.#threshold) this.flush();
  }

  flush(callback) {
    if (this.#flushing) {
      if (callback) this.once('drain', callback);
      return;
    }
    if (this.#size === 0) {
      if (callback) callback();
      return;
    }
    if (this.#writable.destroyed || this.#writable.closed) {
      if (callback) callback();
      return;
    }
    this.#flushing = true;
    const buffer = Buffer.concat(this.#buffers);
    this.#buffers.length = 0;
    this.#size = 0;
    this.#writable.write(buffer, (error) => {
      this.#flushing = false;
      this.emit('drain');
      if (callback) callback(error);
    });
  }

  async close() {
    clearInterval(this.#flushTimer);
    return new Promise((resolve, reject) => {
      this.flush((error) => {
        if (error) return void reject(error);
        this.#writable.end(resolve);
      });
    });
  }
}

class Formatter {
  #worker = 'W0';
  #home = './';

  constructor(options = {}) {
    const { worker, home } = options;
    if (worker) this.#worker = worker;
    if (home) this.#home = home;
  }

  format(tag, indent, args) {
    let line = util.format(...args);
    if (tag === 'error' || tag === 'debug') line = this.normalizeStack(line);
    return ' '.repeat(indent) + line;
  }

  formatPretty(tag, indent, args) {
    const dateTime = new Date().toISOString();
    const message = this.format(tag, indent, args);
    const normalColor = TEXT_COLOR[tag];
    const markColor = TAG_COLOR[tag];
    const time = normalColor(dateTime.substring(TIME_START, TIME_END));
    const id = normalColor(this.#worker);
    const mark = markColor(' ' + tag.padEnd(TAG_LENGTH));
    const msg = normalColor(message);
    return `${time}  ${id}  ${mark}  ${msg}`;
  }

  formatFile(tag, indent, args) {
    const dateTime = new Date().toISOString();
    const message = this.format(tag, indent, args);
    const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
    return `${dateTime} [${tag}] ${msg}`;
  }

  formatJson(tag, indent, args) {
    const timestamp = new Date().toISOString();
    const json = { timestamp, worker: this.#worker, tag, message: null };
    let data = args.slice();
    const head = data[0];
    if (metautil.isError(head)) {
      json.error = this.expandError(head);
      data = data.slice(1);
    } else if (typeof head === 'object') {
      Object.assign(json, head);
      data = data.slice(1);
    }
    json.message = util.format(...data);
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
  #worker = 'W0';
  #createStream = fs.createWriteStream;
  #options = null;
  #keepDays = DEFAULT_KEEP_DAYS;
  #stream = null;
  #rotationTimer = null;
  #file = '';
  #fsEnabled = false;
  #toFile = null;
  #toStdout = null;
  #buffer = null;
  #formatter = null;

  constructor(options) {
    super();
    this.#options = options;
    const { workerId, createStream, keepDays, home, crash, json } = options;
    const { toFile = LOG_TAGS, toStdout = LOG_TAGS } = options;
    this.path = options.path;
    this.home = home;
    this.console = new Console(this);
    if (workerId) this.#worker = `W${workerId}`;
    if (toFile) this.#toFile = logTags(toFile);
    if (toStdout) this.#toStdout = logTags(toStdout);
    if (createStream) this.#createStream = createStream;
    if (keepDays) this.#keepDays = keepDays;
    if (crash === 'flush') this.#setupCrashHandling();
    this.#fsEnabled = toFile.length !== 0;
    this.#buffer = null;
    this.#formatter = new Formatter({ json, worker: this.#worker, home });
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
    const fileName = metautil.nowDate() + '-' + this.#worker + '.log';
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
    const stream = this.#createStream(this.#file, { flags: 'a' });
    this.#stream = stream;
    const { writeBuffer, flushInterval } = this.#options;
    this.#buffer = new BufferedStream({ writeBuffer, stream, flushInterval });
    stream.on('error', (error) => {
      const errorMsg = `Can't open log file: ${this.#file}, ${error.message}`;
      this.emit('error', new Error(errorMsg));
    });
    await EventEmitter.once(stream, 'open');
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
    if (stream.destroyed || stream.closed) return Promise.resolve();
    clearTimeout(this.#rotationTimer);
    this.#rotationTimer = null;
    return new Promise((resolve, reject) => {
      this.flush((error) => {
        if (error) return void reject(error);
        this.active = false;
        this.#buffer
          .close()
          .then(() => {
            const fileName = this.#file;
            this.emit('close');
            fs.stat(fileName, (error, stats) => {
              if (error || stats.size > 0) {
                return void resolve();
              }
              fsp.unlink(fileName).catch(() => {});
              resolve();
            });
          })
          .catch(reject);
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

  write(tag, indent, args) {
    if (this.#toStdout[tag]) {
      const line = this.#options.json
        ? this.#formatter.formatJson(tag, indent, args)
        : this.#formatter.formatPretty(tag, indent, args);
      process.stdout.write(line + '\n');
    }
    if (this.#toFile[tag]) {
      const line = this.#options.json
        ? this.#formatter.formatJson(tag, indent, args)
        : this.#formatter.formatFile(tag, indent, args);
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
