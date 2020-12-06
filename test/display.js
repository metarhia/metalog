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
  const { console } = logger;

  console.log('Regular test log message');
  console.info('Info test log message');
  console.warn('Warning test log message');
  console.debug('Debug test log message');
  const err = new Error('Error test log message');
  console.error(err);

  logger.close();
})();
