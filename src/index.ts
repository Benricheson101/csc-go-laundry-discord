import 'dotenv/config';

import assert from 'node:assert';

import {CSCGo} from './cscgo';
import {Database} from './db';
import {DiscordAPI} from './discord/api';
import {InfoCommand} from './discord/cmds/info';
import {KioskCommand} from './discord/cmds/kiosk';
import {NotifyCommand} from './discord/cmds/notify';
import {RoomCommand} from './discord/cmds/room';
import type {Command, SelectMenu} from './discord/interaction';
import {KioskRoomSelectMenu} from './discord/menu/kiosk';
import {NotifyMeSelectMenu, NotifyMeSpecificMenu} from './discord/menu/notify';
import {DiscordService} from './svc/discord';
import {KioskService} from './svc/kiosk';
import {NotificationService} from './svc/notify';
import {Logger} from './util/logger';

// TODO: limit number of kiosk messages per server?
// TODO: handle deleted kiosk messages

const interval = Number(process.env.INTERVAL) * 1_000 || 60_000;
process.env.INTERVAL = interval.toString();

const location = process.env.CSCGO_LOCATION!;
assert(location);

const discordToken = process.env.DISCORD_TOKEN;
assert(discordToken);

const dbFile = process.env.DATABASE_PATH || './db/database.db';

const main = async () => {
  const logger = Logger.withValues({service: 'main'});

  const dapi = new DiscordAPI(discordToken);
  const db = new Database(dbFile);
  const cscgo = new CSCGo(location);
  await cscgo.populateCache();

  const kioskSvc = new KioskService(db, dapi, cscgo);
  const notifySvc = new NotificationService(db, dapi, cscgo);
  const discordSvc = new DiscordService(db, dapi, cscgo);

  const commands: Command[] = [
    InfoCommand,
    NotifyCommand,
    RoomCommand,
    KioskCommand,
  ].map(C => new C());

  const selectMenus: SelectMenu[] = [
    KioskRoomSelectMenu,
    NotifyMeSelectMenu,
    NotifyMeSpecificMenu,
  ].map(S => new S());

  discordSvc.addCommands(commands);
  discordSvc.addSelectMenus(selectMenus);
  //console.log(await discordSvc.createDiscordCommands());

  const run = async () => {
    const before = Date.now();
    const roomStatuses = await cscgo.getAllRoomMachineStatuses();
    const after = Date.now();

    logger.verbose('fetched room machine statuses', {
      time_taken: `${after - before}ms`,
    });

    kioskSvc.run(roomStatuses);
    notifySvc.run(roomStatuses);
  };

  discordSvc.start();

  run();
  setInterval(() => {
    run();
  }, interval);
};

main().catch(console.error);
