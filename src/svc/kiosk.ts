import {chunk} from '@benricheson101/util';

import type {AllRoomMachineStatuses, CSCGo} from '../cscgo';
import type {Database} from '../db';
import type {DiscordAPI} from '../discord/api';
import {generateKioskMessage} from '../discord/kiosk';
import {hashRooms} from '../util/room';

const MAX_ROOMS_PER_KIOSK = 24; // multiple of 3

export class KioskService {
  constructor(
    private db: Database,
    private dapi: DiscordAPI,
    private cscgo: CSCGo
  ) {}

  async run(roomStatuses: AllRoomMachineStatuses) {
    console.log(new Date(), '[KioskService] Running');
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
        for (const o of outdated) {
          const updatedMsg = await this.dapi.updateMsg(
            o.channel_id,
            o.message_id,
            msgContents[idx]
          );

          updated.push([roomStatusesHash, updatedMsg.id, Number(idx)]);
        }
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
