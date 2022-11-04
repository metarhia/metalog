'use strict';

const util = require('util');
const concolor = require('concolor');
const metautil = require('metautil');

const STACK_AT = '  at ';
const TYPE_LENGTH = 6;
const LINE_SEPARATOR = ';';
const DATE_LEN = 'YYYY-MM-DD'.length;
const TIME_START = DATE_LEN + 1;
const TIME_END = TIME_START + 'HH:MM:SS'.length;

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

class Formatter {
  #home;
  #workerId;

  constructor(home, workerId) {
    this.#home = home;
    this.#workerId = workerId;
  }

  pretty(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, ...args);
    const normalColor = TEXT_COLOR[type];
    const markColor = TYPE_COLOR[type];
    const time = normalColor(dateTime.substring(TIME_START, TIME_END));
    const id = normalColor(this.#workerId);
    const mark = markColor(' ' + type.padEnd(TYPE_LENGTH));
    const msg = normalColor(message);
    return `${time}  ${id}  ${mark}  ${msg}`;
  }

  file(type, indent, ...args) {
    const dateTime = new Date().toISOString();
    const message = this.format(type, indent, ...args);
    const msg = metautil.replace(message, '\n', LINE_SEPARATOR);
    return `${dateTime} [${type}] ${msg}`;
  }

  json(type, indent, first, ...args) {
    const timestamp = new Date().toISOString();
    const { workerId } = this;
    const log = { timestamp, workerId, level: type, message: null };
    if (metautil.isError(first)) {
      log.err = this.expandError(first);
    } else if (typeof first === 'object') {
      Object.assign(log, first);
      if (metautil.isError(log.err)) log.err = this.expandError(log.err);
      if (metautil.isError(log.error)) log.error = this.expandError(log.error);
    } else {
      log.message = util.format(first, ...args);
    }
    return JSON.stringify(log);
  }

  format(type, indent, ...args) {
    const normalize = type === 'error' || type === 'debug';
    const s = `${' '.repeat(indent)}${util.format(...args)}`;
    return normalize ? this.normalizeStack(s) : s;
  }

  normalizeStack(stack) {
    if (!stack) return 'no data to log';
    let res = metautil.replace(stack, STACK_AT, '');
    if (this.#home) res = metautil.replace(res, this.#home, '');
    return res;
  }

  expandError(err) {
    return {
      ...err,
      message: err.message,
      stack: this.normalizeStack(err.stack),
    };
  }
}

module.exports = { Formatter };
