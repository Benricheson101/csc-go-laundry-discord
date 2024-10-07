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

    const toSend = {
      [SubscriptionType.Machine]: [] as MachineSubscription[],
      [SubscriptionType.NextAvailable]: [] as NextAvailableSubscription[],
    };

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
        console.log(
          'MACHINE SUBSCRIPTION:',
          m.id,
          machine.stickerNumber,
          'is now finished'
        );

        toSend[SubscriptionType.Machine].push(m);

        this.dapi.sendMsg(
          '1292648098996424786',
          generateMachineNotificationMessage(m, machine, roomStatuses.location)
        );
        //this.db.deleteSubscription(m.id);
      }
    }

    for (const na of nextAvailable) {
      const availableMachines =
        roomStatuses.rooms[na.room_id][DBMachineTypeMap[na.machine_type]]
          .available;

      if (availableMachines.length) {
        console.log(
          'NEXT AVAILABLE SUBSCRIPTION:',
          na.id,
          DBMachineTypeMap[na.machine_type],
          'is now available in',
          na.room_id
        );

        toSend[SubscriptionType.NextAvailable].push(na);

        this.dapi.sendMsg(
          '1292648098996424786',
          generateNextAvailableNotificationMessage(
            na,
            roomStatuses.rooms[na.room_id]!,
            roomStatuses.location
          )
        );
        //this.db.deleteSubscription(na.id);
      }
    }

    console.dir(toSend, {depth: null});
  }
}
