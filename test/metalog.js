'use strict';

const tap = require('tap');
const metasync = require('..');

tap.test('stub', (test) => {
  if (metasync) {
    test.end();
  }
});
