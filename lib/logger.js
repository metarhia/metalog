'use strict';

const events = require('node:events');

const { FsWritable } = require('./fsWritable.js');
const { StdoutWritable } = require('./stdoutWritable.js');
const { Formatter } = require('./formatter');
const { Console } = require('./console');

class Logger extends events.EventEmitter {
  constructor(options) {
    super();
    const { path, workerId = 'W0', home = '' } = options;
    this.path = path;
    this.workerId = `W${workerId}`;
    this.home = home;
    this.active = false;
    this.writables = [];
    this.types = {
      log: [],
      info: [],
      warn: [],
      debug: [],
      error: [],
    };
    this.formatter = new Formatter(home, workerId);
    this.console = new Console((...args) => this.write(...args));
    const { fs = null, stdout = {} } = options;
    this.fs = fs ? this.initFs(fs) : null;
    this.stdout = this.initStdout(stdout);
    this.on('error', (err) => this.stdout.write(err.stack));
    return this.open();
  }

  initFs(fsOptions) {
    const { path, workerId } = this;
    const format = (...args) =>
      this.formatter[fsOptions.format || 'file'](...args);
    const fs = new FsWritable({ path, workerId, ...fsOptions, format });
    this.attach(fs);
    return fs;
  }

  initStdout(stdoutOptions) {
    const format = (...args) =>
      this.formatter[stdoutOptions.format || 'pretty'](...args);
    const stdout = new StdoutWritable({ ...stdoutOptions, format });
    this.attach(stdout);
    return stdout;
  }

  attach(writable) {
    if (writable.on) writable.on('error', (error) => this.emit(error));
    const { types } = writable;
    for (const type of types) this.types[type].push(writable);
  }

  loadPlugin(writables = []) {
    const openers = [];
    for (const writable of writables) {
      if (writable.open) openers.push(writable.open());
      this.attach(writable);
      this.writables.push(writable);
    }
    return Promise.all(openers);
  }

  async open() {
    if (this.fs) await this.fs.open();
    this.active = true;
    this.emit('open');
    return this;
  }

  async close() {
    const closers = [];
    if (this.fs) closers.push(this.fs.close());
    for (const writable of this.writables) {
      if (writable.close) closers.push(writable.close());
    }
    await Promise.all(closers);
    this.active = false;
    this.emit('close');
  }

  write(type, indent, ...args) {
    const writables = this.types[type];
    for (const writable of writables) {
      writable.write(type, indent, ...args);
    }
  }
}

const openLog = async (args) => new Logger(args);

module.exports = { Logger, openLog };
