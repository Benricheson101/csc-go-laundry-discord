import type {RESTPostAPIChannelMessageJSONBody} from 'discord-api-types/v10';
import {capitalize} from '@benricheson101/util';

import {
  DBMachineTypeMap,
  type MachineSubscription,
  type NextAvailableSubscription,
} from '../db';
import type {LocationSummary, RoomMachine, RoomMachineStatuses} from '../cscgo';
import {toRoomName} from '../util/room';

export const generateMachineNotificationMessage = (
  sub: MachineSubscription,
  machine: RoomMachine,
  location: LocationSummary
): RESTPostAPIChannelMessageJSONBody => ({
  content: `:bell: **[${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}](https://mycscgo.com/laundry/summary/${location.locationId}/${sub.room_id})**: **${capitalize(machine.type)} #${sub.machine_id}** is now **finished**!`,
});

export const generateNextAvailableNotificationMessage = (
  sub: NextAvailableSubscription,
  roomStatus: RoomMachineStatuses,
  location: LocationSummary
): RESTPostAPIChannelMessageJSONBody => {
  const available = roomStatus[DBMachineTypeMap[sub.machine_type]].available;

  const availableIDs =
    available
      .map(a => a.stickerNumber)
      .toSorted()
      .slice(0, 5)
      .join(', ') +
    (available.length > 5 ? `, and ${available.length - 5} more` : '');

  return {
    content: `:bell: **[${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}](https://mycscgo.com/laundry/summary/${location.locationId}/${sub.room_id})**: **${available.length}** ${DBMachineTypeMap[sub.machine_type]}${available.length > 1 ? 's are' : ' is'} now available (${availableIDs}).`,
  };
};
