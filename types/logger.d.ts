import EventEmitter = require('events');
import { Formatter } from './formatter';
import { FsWritable } from './fsWritable';
import { StdoutWritable } from './stdoutWritable';
import { Writable, LogType } from './interfaces';

type FsOptions = {
  createStream?: () => NodeJS.WritableStream;
  writeInterval?: number;
  writeBuffer?: number;
  keepDays?: number;
  format?: 'json' | 'pretty' | 'file';
  types: LogType[];
};

type StdoutOptions = {
  format?: 'json' | 'pretty' | 'file';
  types: LogType[];
};

export interface LoggerOptions {
  path: string;
  home?: string;
  workerId?: number;
  fs?: FsOptions;
  stdout?: StdoutOptions;
}

export class Logger extends EventEmitter {
  constructor(options: LoggerOptions);

  path: string;
  workerId: string;
  home: string;
  active: boolean;
  formatter: Formatter;
  console: Console;
  fs: FsWritable | null;
  stdout: StdoutWritable;
  writables: Writable[];
  types: {
    log: Writable[];
    info: Writable[];
    warn: Writable[];
    debug: Writable[];
    error: Writable[];
  };

  private initFs(fsOptions: FsOptions): FsWritable;
  private initStdout(stdoutOptions: StdoutOptions): StdoutWritable;
  private attach(writable: Writable): void;

  public loadPlugin(writables: Writable[]): Promise<any[]>;
  public open(): Promise<Logger>;
  public close(): Promise<void>;
  public write(type: string, s: string): void;
}

export function openLog(args: LoggerOptions): Promise<Logger>;
