import EventEmitter = require('events');
import { Formatter } from './types/formatter';

type LogType = 'log' | 'info' | 'warn' | 'debug' | 'error';

type Format = 'json' | 'pretty' | 'file';

interface Options {
  [key: string]: any;
}

interface LoggerConstructor {
  new (options: Options): LoggerInterface;
}

export interface LoggerInterface {
  write(record: string | object): void;
  open?(): Promise<void>;
  close?(): Promise<void>;
}

interface LoggerConf {
  Construct?: LoggerConstructor;
  instance?: LoggerInterface;
  options?: Options;
  format?: Format;
  logTypes: LogType[];
}

interface MetalogOptions {
  path: string;
  home?: string;
  workerId?: number;
  fs: LoggerConf;
  stdout: LoggerConf;
  loggers?: { [name: string]: LoggerConf };
}

interface LoggerContainer {
  instance: LoggerInterface;
  format: (
    ...args: any[]
  ) => Formatter['json'] | Formatter['file'] | Formatter['pretty'] | any[];
  name: string;
}

export class Logger extends EventEmitter {
  constructor(options: MetalogOptions);

  path: string;
  workerId: string;
  home: string;
  active: boolean;
  formatter: Formatter;
  console: Console;
  loggers: LoggerContainer[];
  types: {
    log: LoggerContainer[];
    info: LoggerContainer[];
    warn: LoggerContainer[];
    debug: LoggerContainer[];
    error: LoggerContainer[];
  };

  private initLoggers(loggerConfs: any): void;
  private attachLogger(logTypes: LogType[], logger: any): void;

  public open(): Promise<Logger>;
  public close(): Promise<void>;
  public write(type: string, s: string): void;
}

export function openLog(args: MetalogOptions): Promise<Logger>;
