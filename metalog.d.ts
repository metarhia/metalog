import { EventEmitter } from 'node:events';
import { Console } from 'node:console';

interface LoggerOptions {
  path: string;
  home: string;
  workerId?: number;
  createStream?: () => NodeJS.WritableStream;
  writeInterval?: number;
  writeBuffer?: number;
  keepDays?: number;
  json?: boolean;
  toFile?: Array<string>;
  toStdout?: Array<string>;
  crash?: string;
}

export class Logger extends EventEmitter {
  active: boolean;
  path: string;
  workerId: string;
  home: string;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  get json(): boolean;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(type: string, indent: number, ...args: unknown[]): void;
  flush(callback?: (err?: Error) => void): void;

  #createStream: () => NodeJS.WritableStream;
  #writeInterval: number;
  #writeBuffer: number;
  #keepDays: number;
  #stream: NodeJS.WritableStream;
  #rotationTimer: NodeJS.Timer;
  #flushTimer: NodeJS.Timer;
  #flashing: boolean;
  #buffers: Array<Buffer>;
  #bufferedBytes: number;
  #file: string;
  #fsEnabled: boolean;
  #json: boolean;
  #toFile: Record<string, boolean>;
  #toStdout: Record<string, boolean>;

  #createLogDir(): Promise<void>;
  #format(type: string, indent: number, ...args: unknown[]): string;
  #formatPretty(type: string, indent: number, ...args: unknown[]): string;
  #formatFile(type: string, indent: number, ...args: unknown[]): string;
  #formatJson(type: string, indent: number, ...args: unknown[]): string;
  #normalizeStack(stack: string): string;
  #expandError(err: Error): unknown;
}
