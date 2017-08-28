{
  enabled: true, // Enable logging
  keepDays: 100, // Delete files after N days
  writeInterval: '3s', // Flush log to disk interval (milliseconds)
  writeBuffer: 64 * 1024, // Buffer size 64kb
  applicationLog: false, // Write log to application folder
  serverLog: true, // Write log to server global folder
  files: [
    'access', 'api', 'error', 'debug', 'slow',
    'server', 'node', 'cloud', 'warning'
  ],
  stdout: [
    'error', 'debug', 'warning'
  ]
}
