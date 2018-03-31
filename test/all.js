'use strict';

const tap = require('tap');
const metalog = require('..');

tap.test('stub', (test) => {
  const logger = metalog('./log', 'S1N1');
  logger.open(() => {
    logger.info('Test log message');
    logger.close(() => {
      test.end();
    });
  });
});
