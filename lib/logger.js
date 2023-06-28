'use strict';

const events = require('node:events');
const metautil = require('metautil');

const { Console } = require('./console.js');
const { Formatter } = require('./formatter.js');
const { FsTarget } = require('./target.js');

const DAY_MILLISECONDS = metautil.duration('1d');

const LOG_TYPES = ['log', 'info', 'warn', 'debug', 'error'];

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

const getNextReopen = () => {
  const now = new Date();
  const curTime = now.getTime();
  const nextDate = now.setUTCHours(0, 0, 0, 0);
  return nextDate - curTime + DAY_MILLISECONDS;
};

class Logger extends events.EventEmitter {
  constructor(options) {
    super();
    const { workerId = 0, home, json } = options;
    const { toFile = [], toStdout = [] } = options;
    this.options = options;
    this.active = false;
    this.workerId = `W${workerId}`;
    this.home = home;
    this.json = Boolean(json);
    this.reopenTimer = null;
    this.toFile = logTypes(toFile);
    this.toStdout = logTypes(toStdout);
    this.console = new Console(this);
    this.formatter = new Formatter(this);
    this.fsEnabled = toFile.length !== 0;
    this.target = null;
    return this.open();
  }

  async open() {
    if (this.active) return this;
    if (!this.fsEnabled) {
      this.active = true;
      process.nextTick(() => this.emit('open'));
      return this;
    }
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
    this.target = await new FsTarget(this);
    this.active = true;
    return this;
  }

  async close() {
    if (!this.active) return;
    if (this.target) await this.target.close();
    this.active = false;
    this.emit('close');
  }

  write(type, indent, ...args) {
    const { formatter } = this;
    if (this.toStdout[type]) {
      const line = this.json
        ? formatter.json(type, indent, ...args)
        : formatter.pretty(type, indent, ...args);
      process.stdout.write(line + '\n');
    }
    if (this.toFile[type]) {
      const line = this.json
        ? formatter.json(type, indent, ...args)
        : formatter.file(type, indent, ...args);
      this.target.write(line + '\n');
    }
  }
}

const openLog = async (args) => new Logger(args);

module.exports = { Logger, openLog };
