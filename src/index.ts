import assert from 'node:assert';

import {Database} from './db';
import {CSCGo} from './cscgo';
import {DiscordAPI} from './discord/api';
import {KioskService} from './svc/kiosk';
import {NotificationService} from './svc/notify';
import {DiscordService} from './svc/discord';
import {InfoCommand} from './discord/cmds/info';
import type {Command, SelectMenu} from './discord/interaction';
import {KioskRoomSelectMenu} from './discord/menu/kiosk';
import {NotifyMeSelectMenu, NotifyMeSpecificMenu} from './discord/menu/notify';

// TODO: limit number of kiosk messages per server?
// TODO: handle deleted kiosk messages

const interval = Number(process.env.INTERVAL) || 60_000;
process.env.INTERVAL = interval.toString();

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
  const discordSvc = new DiscordService(db, dapi, cscgo);

  const commands: Command[] = [InfoCommand].map(C => new C());
  const selectMenus: SelectMenu[] = [
    KioskRoomSelectMenu,
    NotifyMeSelectMenu,
    NotifyMeSpecificMenu,
  ].map(S => new S());

  discordSvc.addCommands(commands);
  discordSvc.addSelectMenus(selectMenus);
  //console.log(await discordSvc.createDiscordCommands());

  const run = async () => {
    const roomStatuses = await cscgo.getAllRoomMachineStatuses();
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
