import type {WriteStream} from 'node:tty';
import {inspect} from 'node:util';

enum LogLevel {
  Verbose = 0,
  Info,
  Warning,
  Error,
}

const LogLevelNameMap: {[key in LogLevel]: string} = {
  [LogLevel.Verbose]: 'verbose',
  [LogLevel.Info]: 'info',
  [LogLevel.Warning]: 'warn',
  [LogLevel.Error]: 'error',
};

export class Logger {
  logLevel: LogLevel;

  constructor(readonly fields?: Record<string, unknown>) {
    const logLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    this.logLevel =
      {
        debug: LogLevel.Verbose,
        verbose: LogLevel.Verbose,
        info: LogLevel.Info,
        warn: LogLevel.Warning,
        error: LogLevel.Error,
      }[logLevel] ?? LogLevel.Info;
  }

  verbose = this.#make(LogLevel.Verbose, process.stdout);
  info = this.#make(LogLevel.Info, process.stdout);
  warn = this.#make(LogLevel.Warning, process.stderr);
  error = this.#make(LogLevel.Error, process.stderr);

  #format(
    level: LogLevel,
    msg: unknown,
    fields?: Record<string, unknown>
  ): string {
    const loggerFields = Object.entries({...(this.fields || {})}).map(
      ([k, v]) => [k, inspect(v)]
    );
    const msgFields = Object.entries({...(fields || {})}).map(([k, v]) => [
      k,
      inspect(v),
    ]);

    return (
      // biome-ignore lint/style/useTemplate: shoo
      [
        ['time', new Date().toISOString()],
        ['level', LogLevelNameMap[level]],
        ...loggerFields,
        ...(msg ? [['msg', inspect(msg)]] : []),
        ...msgFields,
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join(' ') + '\n'
    );
  }

  #make(level: LogLevel, stream: WriteStream) {
    return (msg: unknown, fields?: Record<string, unknown>) => {
      if (level >= this.logLevel) {
        stream.write(this.#format(level, msg, fields));
      }
    };
  }

  static withValues(fields: Record<string, unknown>, parent?: Logger) {
    return new Logger(parent ? {...parent.fields, ...fields} : fields);
  }
}
