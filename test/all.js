'use strict';

const tap = require('tap');
const metalog = require('..');

const logger = metalog({
  path: './log',
  nodeId: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5
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
  logger.system('Test log message');
  test.end();
});

tap.test('logger.error', (test) => {
  logger.error('Test log message');
  test.end();
});

tap.test('logger.warn', (test) => {
  logger.warn('Test log message');
  test.end();
});

tap.test('logger.info', (test) => {
  logger.info('Test log message');
  test.end();
});

tap.test('logger.debug', (test) => {
  logger.debug('Test log message');
  test.end();
});

tap.test('logger write more then 60Mb', (test) => {
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
