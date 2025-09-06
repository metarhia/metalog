'use strict';

const test = require('node:test');
const { BufferedStream } = require('../metalog');
const fs = require('node:fs');
const path = require('node:path');

test('BufferedStream with stream', async () => {
  const fileName = path.join('./log', 'test-buffered.log');
  const stream = fs.createWriteStream(fileName, { flags: 'a' });
  const bufferedStream = new BufferedStream({
    stream,
    writeBuffer: 1024,
    flushInterval: 1000,
  });

  bufferedStream.write(Buffer.from('Test message 1\n'));
  bufferedStream.write(Buffer.from('Test message 2\n'));

  await new Promise((resolve) => {
    bufferedStream.flush((error) => {
      if (error) throw error;
      resolve();
    });
  });

  await bufferedStream.close();
  stream.destroy();
});

test('BufferedStream without stream', async () => {
  const bufferedStream = new BufferedStream({
    writeBuffer: 1024,
    flushInterval: 1000,
  });

  bufferedStream.write(Buffer.from('Test message\n'));

  await new Promise((resolve) => {
    bufferedStream.flush((error) => {
      if (error) throw error;
      resolve();
    });
  });

  await bufferedStream.close();
});

test('BufferedStream timer management', async () => {
  const fileName = path.join('./log', 'test-timer.log');
  const stream = fs.createWriteStream(fileName, { flags: 'a' });
  const bufferedStream = new BufferedStream({
    stream,
    writeBuffer: 1024,
    flushInterval: 100,
  });

  bufferedStream.startFlushTimer();
  bufferedStream.write(Buffer.from('Timer test message\n'));

  await new Promise((resolve) => setTimeout(resolve, 200));

  bufferedStream.stopFlushTimer();
  await bufferedStream.close();
  stream.destroy();
});

test('BufferedStream auto-flush on threshold', async () => {
  const fileName = path.join('./log', 'test-threshold.log');
  const stream = fs.createWriteStream(fileName, { flags: 'a' });
  const bufferedStream = new BufferedStream({
    stream,
    writeBuffer: 100,
    flushInterval: 1000,
  });

  for (let i = 0; i < 10; i++) {
    bufferedStream.write(Buffer.from(`Message ${i}\n`));
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  await bufferedStream.close();
  stream.destroy();
});

test('BufferedStream multiple writes', async () => {
  const bufferedStream = new BufferedStream({
    writeBuffer: 1024,
    flushInterval: 1000,
  });

  const messages = ['Message 1', 'Message 2', 'Message 3'];
  for (const message of messages) {
    bufferedStream.write(Buffer.from(message + '\n'));
  }

  await new Promise((resolve) => {
    bufferedStream.flush((error) => {
      if (error) throw error;
      resolve();
    });
  });

  await bufferedStream.close();
});

test('BufferedStream close without stream', async () => {
  const bufferedStream = new BufferedStream();
  await bufferedStream.close();
});

test('BufferedStream flush without stream', async () => {
  const bufferedStream = new BufferedStream();

  await new Promise((resolve) => {
    bufferedStream.flush((error) => {
      if (error) throw error;
      resolve();
    });
  });
});
