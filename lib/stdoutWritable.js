'use strict';

class StdoutWritable {
  constructor(options) {
    this.types = options.types || [];
    this.format = options.format;
  }

  write(...args) {
    const record = this.format(...args);
    process.stdout.write(record + '\n');
  }
}

module.exports = { StdoutWritable };
