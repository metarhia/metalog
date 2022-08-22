'use strict';

const events = require('events');

const { FsLogger } = require('./lib/fsLogger.js');
const { Formatter } = require('./lib/formatter');
const { Console } = require('./lib/console');

const LOG_TYPES = ['log', 'info', 'warn', 'debug', 'error'];

const write = (record) => process.stdout.write(record + '\n');

const LOGGERS = {
  fs: {
    Construct: FsLogger,
    format: 'file',
  },
  stdout: {
    instance: { write },
    format: 'pretty',
  },
};

const combineLoggerOptions = (options) => {
  const { fs, stdout } = options;
  const result = {};
  if (fs) {
    const format = fs.format || LOGGERS.fs.format;
    result.fs = { ...LOGGERS.fs, ...fs, format };
  }
  if (stdout) {
    const format = stdout.format || LOGGERS.stdout.format;
    result.stdout = { ...LOGGERS.stdout, ...stdout, format };
  }
  return result;
};

class Logger extends events.EventEmitter {
  constructor(options) {
    super();
    const { path, home = '', workerId = 0, loggers = {} } = options;
    this.path = path;
    this.workerId = workerId;
    this.home = home;
    this.active = false;
    this.formatter = new Formatter(home, workerId);
    this.console = new Console((...args) => this.write(...args));
    this.loggers = [];
    this.types = {
      log: [],
      info: [],
      warn: [],
      debug: [],
      error: [],
    };
    const defaultLoggers = combineLoggerOptions(options);
    this.initLoggers({ ...defaultLoggers, ...loggers });
    this.on('error', (err) => write(err.stack));
    return this.open();
  }

  initLoggers(loggerConfs) {
    const { path, workerId } = this;
    for (const [name, conf] of Object.entries(loggerConfs)) {
      const { Construct, logTypes, options } = conf;
      const fmtName = this.formatter[conf.format] ? conf.format : 'none';
      const format = (...args) => this.formatter[fmtName](...args);
      const opts = { path, workerId, ...options };
      const instance = conf.instance || new Construct(opts);
      if (instance.on) instance.on('error', (err) => this.emit('error', err));
      const logger = { format, instance, name };
      this.loggers.push(logger);
      this.attachLogger(logTypes, logger);
    }
  }

  attachLogger(logTypes, logger) {
    for (const type of logTypes) this.types[type].push(logger);
  }

  async open() {
    const openers = [];
    for (const { instance } of Object.values(this.loggers)) {
      if (instance.open) openers.push(instance.open());
    }
    await Promise.all(openers);
    this.active = true;
    this.emit('open');
    return this;
  }

  async close() {
    const closes = [];
    for (const { instance } of Object.values(this.loggers)) {
      if (instance.close) closes.push(instance.close());
    }
    await Promise.all(closes);
    this.active = false;
    this.emit('close');
  }

  write(type, indent, ...args) {
    const loggers = this.types[type];
    for (const { format, instance } of loggers) {
      const line = format(type, indent, ...args);
      instance.write(line);
    }
  }
}

const openLog = async (args) => new Logger(args);

module.exports = { Logger, openLog, LOG_TYPES };
