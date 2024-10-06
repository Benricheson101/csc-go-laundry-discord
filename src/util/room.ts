import {existsSync, readFileSync} from 'node:fs';

import type {LocationSummary} from '../cscgo';

const renames: {[key: string]: string} = existsSync('./room_rename.json')
  ? JSON.parse(readFileSync('./room_rename.json', 'utf8'))
  : {};

export const toRoomName = ({
  roomId,
  label,
}: Pick<LocationSummary['rooms'][number], 'roomId' | 'label'>) =>
  roomId in renames ? renames[roomId] : label;
