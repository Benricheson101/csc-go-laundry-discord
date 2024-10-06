import {hash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';

import type {LocationSummary, RoomMachineStatuses} from '../cscgo';

const renames: {[key: string]: string} = existsSync('./room_rename.json')
  ? JSON.parse(readFileSync('./room_rename.json', 'utf8'))
  : {};

export const toRoomName = ({
  roomId,
  label,
}: Pick<LocationSummary['rooms'][number], 'roomId' | 'label'>) =>
  roomId in renames ? renames[roomId] : label;

/** Hashes room statuses. Used for diff'ing */
export const hashRooms = (rooms: [string, RoomMachineStatuses][]): string => {
  const careAbout = rooms
    .map(([r, m]) => [
      r,
      Object.values(m).flatMap(a =>
        Object.values(a).flatMap(m => (Array.isArray(m) ? m.length : m))
      ),
    ])
    .join(';');

  return hash('sha256', careAbout, 'hex');
};
