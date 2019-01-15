'use strict';

const metatests = require('metatests');
const metalog = require('..');

const createLogger = () => metalog({
  path: './log',
  node: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5,
  toStdout: []
}).bind('app1');

const logger1 = createLogger();

metatests.test('logger.open', test => {
  logger1.logger.on('open', () => {
    test.end();
  });
  logger1.logger.on('error', err => {
    test.error(err);
    process.exit(1);
  });
  logger1.logger.open();
});

metatests.test('logger.system', test => {
  logger1.system('System test log message');
  test.end();
});

metatests.test('logger.fatal', test => {
  logger1.fatal('Fatal test log message');
  test.end();
});

metatests.test('logger.error', test => {
  logger1.error('Error test log message');
  test.end();
});

metatests.test('logger.warn', test => {
  logger1.warn('Warning test log message');
  test.end();
});

metatests.test('logger.info', test => {
  logger1.info('Info test log message');
  test.end();
});

metatests.test('logger.debug', test => {
  logger1.debug('Debug test log message');
  test.end();
});

metatests.test('logger.slow', test => {
  logger1.slow('Slow test log message');
  test.end();
});

metatests.test('logger.db', test => {
  logger1.slow('Database test log message');
  test.end();
});

const logger2 = createLogger();

metatests.test('logger write more then 60Mb', test => {
  logger2.logger.open();
  logger2.logger.toStdout.INFO = false;
  const begin = process.hrtime();
  for (let i = 0; i < 1000000; i++) {
    logger2.info('Write more then 60Mb logs, line: ' + i);
  }
  logger2.logger.close();
  logger2.logger.on('close', () => {
    const end = process.hrtime(begin);
    const time = end[0] * 1e9 + end[1];
    logger2.logger.open();
    logger2.logger.on('open', () => {
      logger2.logger.toStdout.INFO = true;
      logger2.info(time);
      test.end();
    });
  });
});

const logger3 = createLogger();

metatests.test('logger.close', test => {
  logger3.logger.open();
  logger3.info('Info log message');
  logger3.logger.close();
  logger3.logger.on('close', () => {
    test.end();
  });
});

const logger4 = createLogger();

metatests.test('logger.close after close', test => {
  logger4.logger.open();
  logger4.info('Info log message');
  logger4.logger.close();
  logger4.logger.on('close', () => {
    logger4.logger.removeAllListeners('close');
    logger4.logger.close();
    logger4.logger.on('close', test.mustNotCall());
    test.end();
  });
});

const logger5 = createLogger();

metatests.test('logger.rotate', test => {
  logger5.logger.rotate();
  test.end();
});
