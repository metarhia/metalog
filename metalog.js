'use strict';

const fs = require('fs');
const common = require('metarhia-common');
const concolor = require('concolor');
const metasync = require('metasync');
const mkdirp = require('mkdirp');

const LOG_TYPES = {
  access: 'http',
  slow: 'http',
  api: 'jstp',
  server: 'master',
  cloud: 'master',
  error: 'shared',
  debug: 'shared',
  node: 'shared',
  warning: 'shared'
};

// const FILE_TYPES = Object.keys(LOG_TYPES);

const DAY_MILLISECONDS = common.duration('1d');
const SEMICOLON_REGEXP = /;/g;

const cError = concolor('b,red');
const cDebug = concolor('b,green');
const cWarn = concolor('b,yellow');

function Logger(
  // Logger constructor
  impress, // Impress Application Server
  application, // object, application
  parent // object, parent Logger instace
) {
  this.active = false;
  this.impress = impress;
  this.application = application;
  this.parent = parent;
  this.config = application.config.log;
  this.dir = application.dir + '/log';
  this.files = new Map(); // item structure: { fd, buf, timer, lock }
}

Logger.prototype.open = (callback) => {
  callback = common.once(callback);
  if (!this.config.enabled) {
    callback();
    return;
  }
  mkdirp(this.dir, (err) => {
    if (err) {
      console.error(err);
      callback();
      return;
    }
    const now = new Date();
    const nextDate = new Date();
    metasync.each(
      this.fileTypes,
      (fileType, cb) => this.openFile(fileType, cb),
      () => {
        this.active = true;
        callback();
      }
    );
    nextDate.setUTCHours(0, 0, 0, 0);
    const nextReopen = nextDate - now + DAY_MILLISECONDS;
    setTimeout(this.open, nextReopen);
    if (this.config.keepDays && process.isMaster) {
      this.deleteOldFiles();
    }
  });
};

Logger.prototype.openFile = (fileType, callback) => {
  const logType = LOG_TYPES[fileType];
  const forMaster = logType === 'master';
  const perWorker = logType === 'http' || logType === 'jstp';
  const isShared = logType === 'shared';
  if (!forMaster) {
    if (process.isMaster) {
      callback();
      return;
    }
    if (!isShared && logType !== this.impress.serverProto) {
      callback();
      return;
    }
  }
  const date = common.nowDate();
  let fileName = this.dir + '/' + date + '-' + fileType;
  if (perWorker) fileName += '-' + this.impress.nodeId;
  fileName += '.log';
  this.closeFile(fileType, () => {
    const fd = fs.createWriteStream(fileName, {
      flags: 'a', highWaterMark: this.config.writeBuffer
    });
    const timer = setInterval(() => {
      this.flush(fileType);
    }, this.config.writeInterval);
    const file = { fd, buf: '', lock: false, timer };
    this.files.set(fileType, file);
    file.fd.on('open', callback);
    file.fd.on('error', callback);
  });
};

Logger.prototype.close = (callback) => {
  this.active = false;
  if (!this.config.enabled) {
    callback();
    return;
  }
  metasync.each(this.fileTypes, this.closeFile, callback);
};

Logger.prototype.closeFile = (fileType, callback) => {
  const file = this.files.get(fileType);
  if (!file) {
    callback();
    return;
  }
  const filePath = file.fd.path;
  this.flush(fileType, () => {
    if (file.fd.destroyed || file.fd.closed) {
      callback();
      return;
    }
    file.fd.end(() => {
      clearInterval(file.timer);
      this.files.delete(fileType);
      fs.stat(filePath, (err, stats) => {
        if (err || stats.size > 0) {
          callback();
          return;
        }
        fs.unlink(filePath, callback);
      });
    });
  });
};

Logger.prototype.deleteOldFiles = () => {
  fs.readdir(this.dir, (err, files) => {
    if (err) return;
    const now = new Date();
    const date = new Date(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
    );
    const time = date.getTime();
    const cb = common.emptiness;
    let i, fileTime, fileAge;
    for (i in files) {
      fileTime = new Date(files[i].substring(0, 10)).getTime();
      fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS);
      if (fileAge > 1 && fileAge > this.config.keepDays) {
        fs.unlink(this.dir + '/' + files[i], cb);
      }
    }
  });
};

Logger.prototype.write = (fileType, message) => {
  const file = this.files.get(fileType);
  if (!file) return;
  let msg = (
    new Date().toISOString() + '\t' +
    this.impress.processMarker + '\t' +
    message + '\n'
  );
  file.buf += msg;
  if (this.config.stdout.includes(fileType)) {
    msg = msg.substring(0, msg.length - 1);
    msg = msg.replace(SEMICOLON_REGEXP, '\n ');
    /**/ if (fileType === 'error') msg = cError(msg);
    else if (fileType === 'debug') msg = cDebug(msg);
    else if (fileType === 'warning') msg = cWarn(msg);
    console.log(msg);
  }
};

Logger.prototype.flush = (fileType, callback) => {
  callback = common.once(callback);
  const file = this.files.get(fileType);
  if (!file || file.lock || file.buf.length === 0) {
    callback();
    return;
  }
  file.lock = true;
  const buf = file.buf;
  file.buf = '';
  file.fd.write(buf, () => {
    file.lock = false;
    callback();
  });
};

Logger.prototype.init = () => {
  // Generate log methods, for example:
  //   this.access(message)
  //   this.error(message)
  //   this.debug(message)
  //   this.slow(message)
  //   this.server(message)
  //   this.node(message)
  //   this.cloud(message)
  //   this.warning(message)
  //
  const appName = '[' + this.application.name + ']\t';

  metasync.each(this.fileTypes, (fileType /*cb*/) => {
    const fnN = common.emptiness;
    const fnA = (message) => {
      this.write(fileType, message);
    };
    const fnI = (message) => {
      this.parent.write(fileType, appName + message);
    };
    const fnAI = (message) => {
      this.write(fileType, message);
      this.parent.write(fileType, appName + message);
    };

    let logger = fnN;
    if (this.config.enabled && this.parent.config.enabled) {
      logger = fnAI;
    } else if (this.config.enabled) {
      logger = fnA;
    } else if (this.parent.config.enabled) {
      logger = fnI;
    }
    this[fileType] = logger;
  });
};

module.exports = { Logger };
