import {chunk} from '@benricheson101/util';

import type {
  AllRoomMachineStatuses,
  CSCGo,
} from '../cscgo';
import type {Database} from '../db';
import type {DiscordAPI} from '../discord/api';
import {generateKioskMessage} from '../discord/kiosk';
import type {Service} from '.';
import {hashRooms} from '../util/room';

const MAX_ROOMS_PER_KIOSK = 24; // multiple of 3

export class KioskService implements Service {
  constructor(
    private db: Database,
    private dapi: DiscordAPI,
    private cscgo: CSCGo
  ) {}

  async start(): Promise<void> {
    this.run();
    setInterval(() => {
      this.run();
    }, 60_000);
  }

  async run() {
    console.log(new Date(), '[KioskService] Running');

    const roomStatuses = await this.cscgo.getAllRoomMachineStatuses();
    const roomStatusChunks: AllRoomMachineStatuses[] = chunk(
      roomStatuses.sortedRooms,
      MAX_ROOMS_PER_KIOSK
    ).map(r => ({
      location: roomStatuses.location,
      rooms: Object.fromEntries(r),
      sortedRooms: r,
    }));

    const msgContents = roomStatusChunks.map(r => generateKioskMessage(r));
    const hashes = roomStatusChunks.map(r => hashRooms(r.sortedRooms));

    const updated: [hash: string, messageID: string, idx: number][] = [];
    for (const idx in roomStatusChunks) {
      const roomStatusesHash = hashes[idx];
      const outdated = this.db.getOutdatedKioskMessage(
        roomStatusesHash,
        Number(idx)
      );
      if (outdated.length) {
        console.log('different hashes:', roomStatusesHash, outdated);
        for (const o of outdated) {
          // FIXME: this doesn't bump the updated at timestamp if there aren't any changes,
          // should I change it to just say "Updates every x minutes"?
          const updatedMsg = await this.dapi.updateMsg(
            o.channel_id,
            o.message_id,
            msgContents[idx]
          );

          updated.push([roomStatusesHash, updatedMsg.id, Number(idx)]);
        }
      } else {
        console.log('all hashes are the same');
      }
    }
    this.db.updateManyKioskMessageHashes(updated);

    const missingKioskMessages = this.db.getMissingKioskMessages(
      roomStatusChunks.length
    );
    for (const {idx, channel_id: channelID} of missingKioskMessages) {
      const sent = await this.dapi.sendMsg(channelID, msgContents[idx]);
      this.db.createKioskMessage(sent.id, channelID, hashes[idx], Number(idx));
    }
  }
}
