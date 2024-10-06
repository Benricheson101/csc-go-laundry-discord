import assert from 'node:assert';

import {Database} from './db';
import {CSCGo} from './cscgo';
import {DiscordAPI} from './discord/api';
import {KioskService} from './svc/kiosk';

// TODO: limit number of kiosk messages per server?
// TODO: handle deleted kiosk messages

const location = process.env.CSCGO_LOCATION!;
assert(location);

const discordToken = process.env.DISCORD_TOKEN;
assert(discordToken);

const main = async () => {
  const dapi = new DiscordAPI(discordToken);
  const cscgo = new CSCGo(location);
  const db = new Database('./db/database.sqlite3');

  const kioskSvc = new KioskService(db, dapi, cscgo);

  await Promise.all([void kioskSvc.start()]);
};

main().catch(console.error);
