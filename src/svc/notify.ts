import type {RESTPostAPIChannelMessageJSONBody} from 'discord-api-types/v10';

import {
  type AllRoomMachineStatuses,
  CSCGo,
  MachineClassification,
  type RoomMachine,
} from '../cscgo';
import {
  DBMachineTypeMap,
  type NextAvailableSubscription,
  type MachineSubscription,
  SubscriptionType,
  type Database,
  type Subscription,
} from '../db';
import type {DiscordAPI} from '../discord/api';
import {
  generateMachineNotificationMessage,
  generateNextAvailableNotificationMessage,
} from '../discord/notify';

export class NotificationService {
  constructor(
    private db: Database,
    private dapi: DiscordAPI,
    private cscgo: CSCGo
  ) {}

  async run(roomStatuses: AllRoomMachineStatuses) {
    const subscriptions = this.db.getActiveSubscriptions();

    const {machine, nextAvailable} = subscriptions.reduce(
      (a, c) => {
        const kindMap: {[key in SubscriptionType]: Subscription[]} = {
          [SubscriptionType.Machine]: a.machine,
          [SubscriptionType.NextAvailable]: a.nextAvailable,
        };

        kindMap[c.type].push(c);
        return a;
      },
      {
        machine: [] as MachineSubscription[],
        nextAvailable: [] as NextAvailableSubscription[],
      }
    );

    const roomMachineCache = new Map<string, RoomMachine[]>();
    const getRoomMachines = async (roomID: string): Promise<RoomMachine[]> => {
      const roomMachines = roomMachineCache.has(roomID)
        ? roomMachineCache.get(roomID)!
        : await this.cscgo.getRoomMachines(roomID);

      roomMachineCache.set(roomID, roomMachines);
      return roomMachines;
    };

    const toSend: [
      sub: Subscription,
      msg: (pretty: boolean) => RESTPostAPIChannelMessageJSONBody,
    ][] = [];

    for (const m of machine) {
      const roomMachines = await getRoomMachines(m.room_id);
      const machine = roomMachines.find(r => r.stickerNumber === m.machine_id)!;
      if (!machine) {
        console.error("can't find machine for subscription:", m);
        continue;
      }

      if (
        [
          MachineClassification.Available,
          MachineClassification.Finished,
        ].includes(CSCGo.classifyMachine(machine))
      ) {
        toSend.push([
          m,
          generateMachineNotificationMessage(m, machine, roomStatuses.location),
        ]);

        this.db.deleteSubscription(m.id);
      }
    }

    for (const na of nextAvailable) {
      const availableMachines =
        roomStatuses.rooms[na.room_id][DBMachineTypeMap[na.machine_type]]
          .available;

      if (availableMachines.length) {
        toSend.push([
          na,
          generateNextAvailableNotificationMessage(
            na,
            roomStatuses.rooms[na.room_id]!,
            roomStatuses.location
          ),
        ]);

        this.db.deleteSubscription(na.id);
      }
    }

    console.log('Sending', toSend.length, 'notifications');

    const dmChannelCache = new Map<string, string>();
    for (const [sub, buildMsg] of toSend) {
      if (!sub.dm_channel_id && !dmChannelCache.has(sub.user_id)) {
        const channel = await this.dapi.createDM(sub.user_id);
        this.db.setDMChannelID(sub.user_id, channel.id);
        sub.dm_channel_id = channel.id;
      }

      dmChannelCache.set(sub.user_id, sub.dm_channel_id!);

      const dmChannel = dmChannelCache.get(sub.user_id)!;
      const sentMsg = await this.dapi.sendMsg(dmChannel, buildMsg(false));
      this.dapi.updateMsg(dmChannel, sentMsg.id, buildMsg(true));
    }
  }
}
