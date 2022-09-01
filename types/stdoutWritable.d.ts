import { Writable, LogType, Format } from './interfaces';

export class StdoutWritable implements Writable {
  constructor(options: { types: LogType[]; format: Format });
  types: LogType[];
  format: Format;
  write(...args: any[]): void;
}
