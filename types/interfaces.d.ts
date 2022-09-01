export type LogType = 'log' | 'info' | 'warn' | 'debug' | 'error';

export type Format = (...args: any[]) => string;

export interface Writable {
  write(record: string | object): void;
  open?(): Promise<void>;
  close?(): Promise<void>;
  on?(event: string, callback: (...args: any[]) => void): void;
}
