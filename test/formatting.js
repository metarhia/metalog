'use strict';

const test = require('node:test');
const { Formatter } = require('../metalog');

test('Formatter basic formatting', () => {
  const formatter = new Formatter({
    json: false,
    worker: 'W1',
    home: '/test/home',
  });

  const args = ['Test message', 'arg2'];
  const formatted = formatter.format('info', 0, args);
  const pretty = formatter.formatPretty('info', 0, args);
  const file = formatter.formatFile('info', 0, args);
  const json = formatter.formatJson('info', 0, args);

  if (!formatted.includes('Test message')) {
    throw new Error('Format failed');
  }
  if (!pretty.includes('Test message')) {
    throw new Error('FormatPretty failed');
  }
  if (!file.includes('Test message')) {
    throw new Error('FormatFile failed');
  }
  if (!json.includes('Test message')) {
    throw new Error('FormatJson failed');
  }
});

test('Formatter with JSON mode', () => {
  const formatter = new Formatter({
    json: true,
    worker: 'W2',
    home: '/test/home',
  });

  const args = ['Test JSON message'];
  const json = formatter.formatJson('error', 0, args);
  const parsed = JSON.parse(json);

  if (parsed.tag !== 'error') {
    throw new Error('JSON tag incorrect');
  }
  if (parsed.message !== 'Test JSON message') {
    throw new Error('JSON message incorrect');
  }
  if (parsed.worker !== 'W2') {
    throw new Error('JSON worker incorrect');
  }
});

test('Formatter error handling', () => {
  const formatter = new Formatter({
    json: false,
    worker: 'W3',
    home: '/test/home',
  });

  const error = new Error('Test error');
  const expanded = formatter.expandError(error);

  if (expanded.message !== 'Test error') {
    throw new Error('Error expansion failed');
  }
  if (!expanded.stack) throw new Error('Error stack missing');
});

test('Formatter stack normalization', () => {
  const formatter = new Formatter({
    json: false,
    worker: 'W4',
    home: '/test/home',
  });

  const stack =
    'Error: Test\n  ' +
    'at /test/home/file.js:1:1\n  ' +
    'at /other/path/file.js:2:2';
  const normalized = formatter.normalizeStack(stack);

  if (normalized.includes('/test/home')) {
    throw new Error('Home path not normalized');
  }
  if (!normalized.includes('file.js:1:1')) {
    throw new Error('Stack trace corrupted');
  }
  if (!normalized.includes('file.js:2:2')) {
    throw new Error('Stack trace corrupted');
  }
});

test('Formatter with different log tags', () => {
  const formatter = new Formatter({
    json: false,
    worker: 'W5',
    home: '/test/home',
  });

  const tags = ['log', 'info', 'warn', 'error', 'debug'];
  for (const tag of tags) {
    const formatted = formatter.format(tag, 0, ['Test message']);
    if (!formatted.includes('Test message')) {
      throw new Error(`Format failed for tag: ${tag}`);
    }
  }
});

test('Formatter with indentation', () => {
  const formatter = new Formatter({
    json: false,
    worker: 'W6',
    home: '/test/home',
  });

  const formatted = formatter.format('info', 4, ['Indented message']);
  if (!formatted.startsWith('    ')) {
    throw new Error('Indentation not applied');
  }
});

test('Formatter JSON with error object', () => {
  const formatter = new Formatter({
    json: true,
    worker: 'W7',
    home: '/test/home',
  });

  const error = new Error('JSON error test');
  const json = formatter.formatJson('error', 0, [error]);
  const parsed = JSON.parse(json);

  if (parsed.tag !== 'error') {
    throw new Error('JSON tag incorrect');
  }
  if (!parsed.error) throw new Error('Error object missing');
  if (parsed.error.message !== 'JSON error test') {
    throw new Error('Error message incorrect');
  }
});

test('Formatter JSON with mixed arguments', () => {
  const formatter = new Formatter({
    json: true,
    worker: 'W8',
    home: '/test/home',
  });

  const obj = { custom: 'data', value: 42 };
  const json = formatter.formatJson('info', 0, [obj, 'Additional message']);
  const parsed = JSON.parse(json);

  if (parsed.tag !== 'info') {
    throw new Error('JSON tag incorrect');
  }
  if (parsed.custom !== 'data') {
    throw new Error('Custom data missing');
  }
  if (parsed.value !== 42) {
    throw new Error('Custom value missing');
  }
  if (parsed.message !== 'Additional message') {
    throw new Error('Message incorrect');
  }
});

test('Formatter default options', () => {
  const formatter = new Formatter();

  const formatted = formatter.format('info', 0, ['Default test']);
  if (!formatted.includes('Default test')) {
    throw new Error('Default formatter failed');
  }
});

test('Formatter normalizeStack with null', () => {
  const formatter = new Formatter();
  const normalized = formatter.normalizeStack(null);

  if (normalized !== 'No stack trace to log') {
    throw new Error('Null stack not handled');
  }
});

test('Formatter normalizeStack with undefined', () => {
  const formatter = new Formatter();
  const normalized = formatter.normalizeStack(undefined);

  if (normalized !== 'No stack trace to log') {
    throw new Error('Undefined stack not handled');
  }
});
