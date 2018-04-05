'use strict';

const metalog = require('..');
const common = require('metarhia-common');

const logger = metalog({
  path: './log',
  nodeId: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5
});

const STACK_REGEXP = [
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
].map(([rx, to]) => {
  if (typeof(rx) === 'string') {
    rx = common.newEscapedRegExp(rx);
  }
  return [rx, to];
});

const normalizeStack = (stack) => {
  if (!stack) return '';
  STACK_REGEXP.forEach(([rx, to]) => {
    stack = stack.replace(rx, to);
  });
  return stack;
};

logger.system('System test log message');
logger.fatal('Fatal test log message');
logger.error('Error test log message');
logger.warn('Warning test log message');
logger.info('Info test log message');
logger.debug('Debug test log message');
logger.access('Access test log message');
logger.slow('Slow test log message');

const stack = new Error('Stack test log message').stack;
logger.error(normalizeStack(stack));

logger.close();
