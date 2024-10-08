import {capitalize} from '@benricheson101/util';
import type {RESTPostAPIChannelMessageJSONBody} from 'discord-api-types/v10';

import type {LocationSummary, RoomMachine, RoomMachineStatuses} from '../cscgo';
import {
  DBMachineTypeMap,
  type MachineSubscription,
  type NextAvailableSubscription,
} from '../db';
import {toRoomName} from '../util/room';

const BELL_EMOJI = '\u{1F514}';

export const generateMachineNotificationMessage =
  (sub: MachineSubscription, machine: RoomMachine, location: LocationSummary) =>
  (pretty: boolean): RESTPostAPIChannelMessageJSONBody => ({
    content: pretty
      ? `${BELL_EMOJI} **[${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}](https://mycscgo.com/laundry/summary/${location.locationId}/${sub.room_id})**: **${capitalize(machine.type)} #${sub.machine_id}** is now **finished**!`
      : `${BELL_EMOJI} ${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}: ${capitalize(machine.type)} #${sub.machine_id} is now finished!`,
  });

export const generateNextAvailableNotificationMessage =
  (
    sub: NextAvailableSubscription,
    roomStatus: RoomMachineStatuses,
    location: LocationSummary
  ) =>
  (pretty: boolean): RESTPostAPIChannelMessageJSONBody => {
    const available = roomStatus[DBMachineTypeMap[sub.machine_type]].available;

    const availableIDs =
      available
        .map(a => a.stickerNumber)
        .toSorted()
        .slice(0, 5)
        .join(', ') +
      (available.length > 5 ? `, and ${available.length - 5} more` : '');

    return {
      content: pretty
        ? `${BELL_EMOJI} **[${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}](https://mycscgo.com/laundry/summary/${location.locationId}/${sub.room_id})**: **${available.length}** ${DBMachineTypeMap[sub.machine_type]}${available.length > 1 ? 's are' : ' is'} now available (${availableIDs}).`
        : `${BELL_EMOJI} ${toRoomName(location.rooms.find(r => r.roomId === sub.room_id)!)}: ${available.length} ${DBMachineTypeMap[sub.machine_type]}${available.length > 1 ? 's are' : ' is'} now available (${availableIDs}).`,
    };
  };
