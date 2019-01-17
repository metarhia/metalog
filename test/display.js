'use strict';

const metalog = require('..');

const logger = metalog({
  path: './log',
  node: 'S1N1',
  application: 'app1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5,
});

const appLogger = logger.bind('app');

const stack = new Error('Stack test log message').stack;
appLogger.debug(stack);
appLogger.system('System test log message');
appLogger.fatal('Fatal test log message');
appLogger.error('Error test log message');
appLogger.warn('Warning test log message');
appLogger.info('Info test log message');
appLogger.debug('Debug test log message');
appLogger.access('Access test log message');
appLogger.slow('Slow test log message');
appLogger.db('Database test log message');

const defaultLogger = logger.bind();
defaultLogger.info('Write to default application logger');

logger.close();
