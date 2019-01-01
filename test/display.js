'use strict';

const metalog = require('..');

const logger = metalog({
  path: './log',
  node: 'S1N1',
  application: 'app1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5
});

logger.system('System test log message');
logger.system('System test log message', 'app');
logger.fatal('Fatal test log message');
logger.fatal('Fatal test log message', 'app');
logger.error('Error test log message');
logger.error('Error test log message', 'app');
logger.warn('Warning test log message');
logger.warn('Warning test log message', 'app');
logger.info('Info test log message');
logger.info('Info test log message', 'app');
logger.debug('Debug test log message');
logger.debug('Debug test log message', 'app');
logger.access('Access test log message');
logger.access('Access test log message', 'app');
logger.slow('Slow test log message');
logger.slow('Slow test log message', 'app');
const stack = new Error('Stack test log message').stack;
logger.debug(stack);
logger.debug(stack, 'app');

logger.close();
