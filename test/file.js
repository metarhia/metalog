'use strict';

const tap = require('tap');
const metalog = require('..');

const logger = metalog({
  path: './log',
  nodeId: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5,
  stdout: []
});

tap.test('logger.open', (test) => {
  logger.on('open', () => {
    test.end();
  });
  logger.on('error', (err) => {
    test.error(err);
    process.exit(1);
  });
});

tap.test('logger.system', (test) => {
  logger.system('System test log message');
  test.end();
});

tap.test('logger.fatal', (test) => {
  logger.fatal('Fatal test log message');
  test.end();
});

tap.test('logger.error', (test) => {
  logger.error('Error test log message');
  test.end();
});

tap.test('logger.warn', (test) => {
  logger.warn('Warning test log message');
  test.end();
});

tap.test('logger.info', (test) => {
  logger.info('Info test log message');
  test.end();
});

tap.test('logger.debug', (test) => {
  logger.debug('Debug test log message');
  test.end();
});

tap.test('logger.slow', (test) => {
  logger.slow('Slow test log message');
  test.end();
});

tap.test('logger write more then 60Mb', (test) => {
  logger.stdout.INFO = false;
  logger.removeAllListeners('open');
  const begin = process.hrtime();
  for (let i = 0; i < 1000000; i++) {
    logger.info('Write more then 60Mb logs, line: ' + i);
  }
  logger.close();
  logger.on('close', () => {
    const end = process.hrtime(begin);
    const time = end[0] * 1e9 + end[1];
    logger.open();
    logger.on('open', () => {
      logger.stdout.INFO = true;
      logger.info(time);
      test.end();
    });
  });
});

tap.test('logger.close', (test) => {
  logger.removeAllListeners('close');
  logger.close();
  logger.on('close', () => {
    test.end();
  });
});

tap.test('logger.close after close', (test) => {
  logger.removeAllListeners('close');
  logger.on('close', () => {
    test.notOk();
  });
  logger.close();
  test.end();
});

tap.test('logger.rotate', (test) => {
  logger.rotate();
  test.end();
});
