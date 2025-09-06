'use strict';

const test = require('node:test');
const { nowDays, nameToDays } = require('..');

test('nowDays utility function', () => {
  const days = nowDays();
  if (typeof days !== 'number') {
    throw new Error('nowDays should return a number');
  }
  if (days <= 0) {
    throw new Error('nowDays should return a positive number');
  }

  const now = new Date();
  const expectedDays = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
  if (Math.abs(days - expectedDays) > 1) {
    throw new Error('nowDays result seems incorrect');
  }
});

test('nameToDays utility function', () => {
  const fileName = '2025-01-01-worker.log';
  const days = nameToDays(fileName);
  if (typeof days !== 'number') {
    throw new Error('nameToDays should return a number');
  }

  const expectedDate = new Date(2025, 0, 1, 0, 0, 0, 0);
  const expectedDays = Math.floor(
    expectedDate.getTime() / (24 * 60 * 60 * 1000),
  );
  if (days !== expectedDays) {
    throw new Error('nameToDays calculation incorrect');
  }
});

test('nameToDays with different date formats', () => {
  const testCases = [
    {
      fileName: '2024-12-31-test.log',
      expectedYear: 2024,
      expectedMonth: 11,
      expectedDay: 31,
    },
    {
      fileName: '2023-06-15-app.log',
      expectedYear: 2023,
      expectedMonth: 5,
      expectedDay: 15,
    },
    {
      fileName: '2022-03-08-service.log',
      expectedYear: 2022,
      expectedMonth: 2,
      expectedDay: 8,
    },
    {
      fileName: '2022-03-08-service.log',
      expectedYear: 2022,
      expectedMonth: 2,
      expectedDay: 8,
    },
  ];

  for (const testCase of testCases) {
    const days = nameToDays(testCase.fileName);
    if (typeof days !== 'number') {
      const fileName = testCase.fileName;
      throw new Error(`nameToDays should return a number for ${fileName}`);
    }

    const expectedDate = new Date(
      testCase.expectedYear,
      testCase.expectedMonth,
      testCase.expectedDay,
    );
    const expectedDays = Math.floor(
      expectedDate.getTime() / (24 * 60 * 60 * 1000),
    );
    if (days !== expectedDays) {
      const fileName = testCase.fileName;
      throw new Error(`nameToDays calculation incorrect for ${fileName}`);
    }
  }
});

test('nameToDays with invalid date', () => {
  const invalidFileName = 'invalid-date.log';
  const days = nameToDays(invalidFileName);
  if (typeof days !== 'number') {
    throw new Error('Should return a number even for invalid dates');
  }
  if (!isNaN(days)) {
    throw new Error('Should return NaN for invalid dates');
  }
});

test('nameToDays with short filename', () => {
  const shortFileName = '2025.log';
  const days = nameToDays(shortFileName);
  if (typeof days !== 'number') {
    throw new Error('Should return a number for short filenames');
  }
});

test('nameToDays with empty filename', () => {
  const emptyFileName = '';
  const days = nameToDays(emptyFileName);
  if (typeof days !== 'number') {
    throw new Error('Should return a number for empty filename');
  }
});

test('nowDays consistency', () => {
  const days1 = nowDays();
  const days2 = nowDays();
  if (days1 !== days2) {
    throw new Error('Should return consistent results');
  }
});

test('nameToDays edge cases', () => {
  const edgeCases = [
    '2025-02-29-leap.log', // Leap year
    '2024-02-29-leap.log', // Leap year
    '2023-02-28-normal.log', // Non-leap year
    '2025-01-01-newyear.log', // New year
    '2025-12-31-yearend.log', // Year end
  ];

  for (const fileName of edgeCases) {
    const days = nameToDays(fileName);
    if (typeof days !== 'number') {
      throw new Error(`Should return a number for ${fileName}`);
    }
  }
});

test('nowDays vs nameToDays comparison', () => {
  const today = new Date();
  const todayString = today.toISOString().substring(0, 10);
  const fileName = `${todayString}-test.log`;

  const nowDaysResult = nowDays();
  const nameToDaysResult = nameToDays(fileName);

  if (nowDaysResult !== nameToDaysResult) {
    throw new Error('Should return same result for today');
  }
});
