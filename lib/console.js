'use strict';

const readline = require('readline');
const util = require('util');

const INDENT = 2;

class Console {
  #write;
  #groupIndent;
  #counts;
  #times;

  constructor(write) {
    this.#write = write;
    this.#groupIndent = 0;
    this.#counts = new Map();
    this.#times = new Map();
  }

  assert(assertion, ...args) {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      this.#write('error', this.#groupIndent, err.stack);
    }
  }

  clear() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
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
    if (this.#groupIndent.length === 0) return;
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

module.exports = { Console };
