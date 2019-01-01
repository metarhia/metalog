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
});

const logger1 = createLogger();

metatests.test('logger.open', test => {
  logger1.on('open', () => {
    test.end();
  });
  logger1.on('error', err => {
    test.error(err);
    process.exit(1);
  });
  logger1.open();
});

metatests.test('logger.system', test => {
  logger1.system('System test log message');
  logger1.system('System test log message', 'app');
  test.end();
});

metatests.test('logger.fatal', test => {
  logger1.fatal('Fatal test log message');
  logger1.fatal('Fatal test log message', 'app');
  test.end();
});

metatests.test('logger.error', test => {
  logger1.error('Error test log message');
  logger1.error('Error test log message', 'app');
  test.end();
});

metatests.test('logger.warn', test => {
  logger1.warn('Warning test log message');
  logger1.warn('Warning test log message', 'app');
  test.end();
});

metatests.test('logger.info', test => {
  logger1.info('Info test log message');
  logger1.info('Info test log message', 'app');
  test.end();
});

metatests.test('logger.debug', test => {
  logger1.debug('Debug test log message');
  logger1.debug('Debug test log message', 'app');
  test.end();
});

metatests.test('logger.slow', test => {
  logger1.slow('Slow test log message');
  logger1.slow('Slow test log message', 'app');
  test.end();
});

const logger2 = createLogger();

metatests.test('logger write more then 60Mb', test => {
  logger2.open();
  logger2.toStdout.INFO = false;
  const begin = process.hrtime();
  for (let i = 0; i < 1000000; i++) {
    logger2.info('Write more then 60Mb logs, line: ' + i);
  }
  logger2.close();
  logger2.on('close', () => {
    const end = process.hrtime(begin);
    const time = end[0] * 1e9 + end[1];
    logger2.open();
    logger2.on('open', () => {
      logger2.toStdout.INFO = true;
      logger2.info(time);
      test.end();
    });
  });
});

const logger3 = createLogger();

metatests.test('logger.close', test => {
  logger3.open();
  logger3.info('Info log message');
  logger3.close();
  logger3.on('close', () => {
    test.end();
  });
});

const logger4 = createLogger();

metatests.test('logger.close after close', test => {
  logger4.open();
  logger4.info('Info log message');
  logger4.close();
  logger4.on('close', () => {
    logger4.removeAllListeners('close');
    logger4.close();
    logger4.on('close', test.mustNotCall());
    test.end();
  });
});

const logger5 = createLogger();

metatests.test('logger.rotate', test => {
  logger5.rotate();
  test.end();
});
