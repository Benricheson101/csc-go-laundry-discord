import {chunk} from '@benricheson101/util';

import type {RESTPostAPIChannelMessageJSONBody} from 'discord-api-types/v10';
import type {AllRoomMachineStatuses, CSCGo} from '../cscgo';
import type {Database} from '../db';
import type {DiscordAPI} from '../discord/api';
import {generateKioskMessage} from '../discord/kiosk';
import {Logger} from '../util/logger';
import {hashRooms} from '../util/room';

const MAX_ROOMS_PER_KIOSK = 24; // multiple of 3

export class KioskService {
  private logger = Logger.withValues({service: 'kiosk'});

  constructor(
    private db: Database,
    private dapi: DiscordAPI,
    private cscgo: CSCGo
  ) {}

  async run(roomStatuses: AllRoomMachineStatuses) {
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

    // TODO: track failed update/send

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
    if (updated.length) {
      this.logger.info('updated existing kiosk messages', {n: updated.length});
    } else {
      this.logger.verbose('no kiosk messages to update');
    }

    const missingKioskMessages = this.db.getMissingKioskMessages(
      roomStatusChunks.length
    );
    for (const {
      idx,
      channel_id: channelID,
      guild_id: guildID,
    } of missingKioskMessages) {
      const sent = await this.dapi.sendMsg(channelID, msgContents[idx]);
      this.db.createKioskMessage(
        sent.id,
        channelID,
        guildID,
        hashes[idx],
        Number(idx)
      );
    }
    if (missingKioskMessages.length) {
      this.logger.info('posted missing kiosk messages', {
        n: missingKioskMessages.length,
      });
    } else {
      this.logger.verbose('no missing kiosk messages');
    }
  }

  static generateKioskMessages(
    roomStatuses: AllRoomMachineStatuses
  ): readonly [RESTPostAPIChannelMessageJSONBody[], string[]] {
    const roomStatusChunks: AllRoomMachineStatuses[] = chunk(
      roomStatuses.sortedRooms,
      MAX_ROOMS_PER_KIOSK
    ).map(r => ({
      location: roomStatuses.location,
      rooms: Object.fromEntries(r),
      sortedRooms: r,
    }));

    return [
      roomStatusChunks.map(c => generateKioskMessage(c)),
      roomStatusChunks.map(r => hashRooms(r.sortedRooms)),
    ];
  }
}
