'use strict';

const metalog = require('..');

(async () => {
  const logger = await metalog.openLog({
    path: './log',
    workerId: 7,
    writeInterval: 3000,
    writeBuffer: 64 * 1024,
    keepDays: 5,
    home: process.cwd(),
  });

  logger.log('Regular test log message');
  logger.info('Info test log message');
  logger.warn('Warning test log message');
  const stack = new Error('Stack test log message').stack;
  logger.debug(stack);
  logger.error('Error test log message');

  logger.close();
})();
