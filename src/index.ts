import objectHash from 'object-hash';
import {Database} from './db';
import {
  type AllRoomMachineStatuses,
  CSCGo,
  type RoomMachineStatuses,
} from './cscgo';

import {chunk} from '@benricheson101/util';
import {generateKioskMessage} from './discord/kiosk';
import type {
  APIMessage,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import assert from 'node:assert';

// TODO: limit number of kiosk messages per server?
// TODO: handle deleted kiosk messages

const location = process.env.CSCGO_LOCATION!;
assert(location);

const hashRooms = (rooms: [string, RoomMachineStatuses][]) => {
  const careAbout = rooms.map(([r, m]) => [
    r,
    Object.values(m).flatMap(a =>
      Object.values(a).flatMap(m => (Array.isArray(m) ? m.length : m))
    ),
  ]);
  return objectHash(careAbout);
};

const main = async () => {
  const db = new Database('./db/database.sqlite3');
  const cscgo = new CSCGo(location);

  const sendMsg = async (cID: string, msg: RESTPostAPIChannelMessageJSONBody) =>
    fetch(`https://discord.com/api/v10/channels/${cID}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
      },
      body: JSON.stringify(msg),
    }).then(r => r.json() as Promise<APIMessage>);

  const updateMsg = async (
    msg: RESTPostAPIChannelMessageJSONBody,
    {msgID, cID}: {msgID: string; cID: string}
  ) =>
    fetch(`https://discord.com/api/v10/channels/${cID}/messages/${msgID}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
      },
      body: JSON.stringify(msg),
    }).then(r => r.json() as Promise<APIMessage>);

  const roomStatuses = await cscgo.getAllRoomMachineStatuses();

  const roomStatusChunks: AllRoomMachineStatuses[] = chunk(roomStatuses.sortedRooms, 2).map(r => ({
    location: roomStatuses.location,
    rooms: Object.fromEntries(r),
    sortedRooms: r,
  }));

  const msgContents = roomStatusChunks.map(r => generateKioskMessage(r));
  const hashes = roomStatusChunks.map(r => hashRooms(r.sortedRooms));

  const updated: [hash: string, messageID: string, idx: number][] = [];
  for (const idx in roomStatusChunks) {
    const roomStatusesHash = hashes[idx];
    const outdated = db.getOutdatedKioskMessage(roomStatusesHash, Number(idx));
    if (outdated.length) {
      console.log('different hashes:', roomStatusesHash, outdated);
      for (const o of outdated) {
        // FIXME: this doesn't bump the updated at timestamp if there aren't any changes
        const updatedMsg = await updateMsg(msgContents[idx], {
          cID: o.channel_id,
          msgID: o.message_id,
        });

        updated.push([roomStatusesHash, updatedMsg.id, Number(idx)]);
      }
    } else {
      console.log('all hashes are the same');
    }
  }
  db.updateManyKioskMessageHashes(updated);

  const missingKioskMessages = db.getMissingKioskMessages(
    roomStatusChunks.length
  );
  for (const {idx, channel_id: channelID} of missingKioskMessages) {
    const sent = await sendMsg(channelID, msgContents[idx]);
    db.createKioskMessage(sent.id, channelID, hashes[idx], Number(idx));
  }
};

main().catch(console.error);
