import assert from 'node:assert';

import {Database} from './db';
import {CSCGo} from './cscgo';
import {DiscordAPI} from './discord/api';
import {KioskService} from './svc/kiosk';
import {NotificationService} from './svc/notify';

// TODO: limit number of kiosk messages per server?
// TODO: handle deleted kiosk messages

const interval = Number(process.env.INTERVAL) || 60_000;

const location = process.env.CSCGO_LOCATION!;
assert(location);

const discordToken = process.env.DISCORD_TOKEN;
assert(discordToken);

const main = async () => {
  const dapi = new DiscordAPI(discordToken);
  const cscgo = new CSCGo(location);
  const db = new Database('./db/database.sqlite3');

  const kioskSvc = new KioskService(db, dapi, cscgo);
  const notifySvc = new NotificationService(db, dapi, cscgo);

  const run = async () => {
    const roomStatuses = await cscgo.getAllRoomMachineStatuses();
    kioskSvc.run(roomStatuses);
    notifySvc.run(roomStatuses);
  };

  run();
  setInterval(() => {
    run();
  }, interval);
};

main().catch(console.error);
