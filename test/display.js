'use strict';

const metalog = require('..');

const logger = metalog({
  path: './log',
  nodeId: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5
});

logger.system('System test log message');
logger.fatal('Fatal test log message');
logger.error('Error test log message');
logger.warn('Warning test log message');
logger.info('Info test log message');
logger.debug('Debug test log message');
logger.access('Access test log message');
logger.slow('Slow test log message');
const stack = new Error('Stack test log message').stack;
logger.debug(stack);

logger.close();
