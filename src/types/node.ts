declare namespace NodeJS {
  export interface ProcessEnv {
    DISCORD_TOKEN: string;
    CSCGO_LOCATION: string;
    PORT: string;
    INTERVAL: string;
    LOG_LEVEL: 'verbose' | 'debug' | 'info' | 'warn' | 'error';
  }
}
