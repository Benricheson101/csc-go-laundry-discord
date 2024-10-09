declare namespace NodeJS {
  export interface ProcessEnv {
    /** Discord bot token */
    DISCORD_TOKEN: string;
    /** Discord app public key */
    DISCORD_PUBLIC_KEY: string;
    /** CSCGo location ID (the UUID in the URL when you view a room: https://mycscgo.com/laundry/summary/<location-id>/<room-id>) */
    CSCGO_LOCATION: string;
    /** port for web server to use */
    PORT: string;
    /** interval to poll for updates (seconds) default: 60 */
    INTERVAL?: string;
    /** default: info */
    LOG_LEVEL?: 'verbose' | 'info' | 'warn' | 'error';

    /** location for sqlite3 database. leave empty if using docker. default: ./db/database.db */
    DATABASE_PATH?: string;
    /** (optional): git commit to show in /info command. automatically set when using Docker image */
    GIT_COMMIT?: string;
  }
}
