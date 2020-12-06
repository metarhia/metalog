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
  console.clear();
  console.assert(true, 'Assert message: passed');
  console.assert(false, 'Assert message: not passed');
  console.count('count-label');
  console.countReset('count-label');
  console.debug('Test log message for console.debug', 'arg2');
  console.dir('Test log message for console.dir', 'arg2');
  const err = new Error('Test log message for console.error', 'arg2');
  console.error(err);
  console.group('Test log message for console.group', 'arg2');
  console.groupCollapsed('Test log message for console.group', 'arg2');
  console.groupEnd();
  console.info('Test log message for console.info', 'arg2');
  console.log('Test log message for console.log', 'arg2');
  console.table([
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ]);
  console.time('time-label');
  console.timeEnd('time-label');
  console.timeLog('time-label', 'Test log message for console.timeLog');
  console.trace('Test log message for console.trace', 'arg2');
  console.warn('Test log message for console.warn', 'arg2');

  logger.close();
})();
