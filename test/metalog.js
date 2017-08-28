'use strict';

const tap = require('tap');
const metalog = require('..');

tap.test('stub', (test) => {
  if (metalog) {
    test.end();
  }
});
