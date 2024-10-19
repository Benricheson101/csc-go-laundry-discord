import {chunk} from '@benricheson101/util';

import {Logger} from './util/logger';

const MAX_CONCURRENCY = 10;

export class CSCGo {
  private logger = Logger.withValues({class: 'CSCGo'});

  /** this shouldn't change so caching for faster responses */
  location!: LocationSummary;

  /** this shouldn't change so caching for faster responses. don't trust data that can change, though */
  machines!: {[key: string]: RoomMachine[]};

  /** cache of the last time getAllRoomMachineStatuses() as called */
  lastAllRoomMachineStatuses?: AllRoomMachineStatuses;

  constructor(private locationID: string) {}

  async populateCache() {
    this.location = await this.getLocationSummary();
  }

  async getLocationSummary(): Promise<LocationSummary> {
    return fetch(this.#apiURL()).then(
      r => r.json() as Promise<LocationSummary>
    );
  }

  async getRoomSummary(roomID: string) {
    return fetch(this.#apiURL(`/room/${roomID}/summary`)).then(
      r => r.json() as Promise<RoomSummary>
    );
  }

  async getRoomMachines(roomID: string): Promise<RoomMachine[]> {
    return fetch(this.#apiURL(`/room/${roomID}/machines`))
      .then(r => r.json() as Promise<RoomMachine[]>)
      .catch(err => {
        this.logger.error('failed to get room machines', {roomID, err});
        return err;
      });
  }

  async getAllRoomMachines() {
    type RoomMachinesEntry = [string, RoomMachine[]];

    const location = await this.getLocationSummary();

    const roomChunks = chunk(
      location.rooms.filter(r => r.connected),
      MAX_CONCURRENCY
    );

    const result: RoomMachinesEntry[] = [];
    let totalFailed = 0;

    for (const rooms of roomChunks) {
      this.logger.verbose('getting room machines', {chunkSize: rooms.length});

      const promises = rooms.map(
        async r =>
          [r.roomId, await this.getRoomMachines(r.roomId)] as readonly [
            string,
            RoomMachine[],
          ]
      );

      const [success, failed]: readonly [
        RoomMachinesEntry[],
        PromiseRejectedResult[],
      ] = await Promise.allSettled(promises).then(r =>
        r.reduce(
          (a, c) => (
            a[c.status === 'fulfilled' ? 0 : 1].push(
              ('value' in c ? c.value : c) as any
            ),
            a
          ),
          [[] as RoomMachinesEntry[], [] as PromiseRejectedResult[]]
        )
      );

      totalFailed += failed.length;

      result.push(...success);
    }

    if (totalFailed) {
      this.logger.error('failed to fetch some room machines', {
        failed: totalFailed,
      });
    }

    this.logger.info('got machine statuses', {n: result.length});

    const allRoomMachines = Object.fromEntries(result);
    this.machines = allRoomMachines;
    return allRoomMachines;
  }

  async getAllRoomMachineStatuses() {
    const location = await this.getLocationSummary();

    const roomMachines = Object.values(await this.getAllRoomMachines());

    const agg = roomMachines.reduce<AllRoomMachineStatuses['rooms']>(
      (a, c1) => (
        (a[c1[0].roomId] = c1.reduce<RoomMachineStatuses>((a, c) => {
          if (!(c.type in a)) {
            a[c.type] = {
              total: 0,
              available: [],
              inUse: [],
              finished: [],
              unknown: [],
            };
          }

          const obj = a[c.type];
          obj.total++;

          const cls = CSCGo.classifyMachine(c);
          obj[cls].push(c);

          obj.inUse.sort((a, b) => a.timeRemaining - b.timeRemaining);

          return a;
        }, {} as RoomMachineStatuses)),
        a
      ),
      {}
    );

    const sortedRooms = Object.entries(agg).toSorted(
      ([a], [b]) => Number(a.split('-')[1]) - Number(b.split('-')[1])
    );

    const result = {location, rooms: agg, sortedRooms};
    this.lastAllRoomMachineStatuses = result;
    return result;
  }

  roomLink(roomID: string) {
    return `https://mycscgo.com/laundry/summary/${this.locationID}/${roomID}`;
  }

  static classifyMachine(machine: RoomMachine): MachineClassification {
    switch (true) {
      case machine.available && machine.mode === MachineMode.PressStart: // TODO: is this this the right place
      case machine.available && machine.mode === MachineMode.Idle: {
        return MachineClassification.Available;
      }

      case !machine.available && machine.mode === MachineMode.Running: {
        return MachineClassification.InUse;
      }

      // TODO: not sure about these two
      case machine.mode === 'running' && machine.timeRemaining === 0:
      case !machine.available && machine.mode === 'idle': {
        return MachineClassification.Finished;
      }

      default: {
        Logger.withValues({class: 'CSCGo'}).warn('weird state', {
          available: machine.available,
          mode: machine.mode,
          time_remaining: machine.timeRemaining,
          machine_id: machine.stickerNumber,
          room_id: machine.roomId,
        });
        return MachineClassification.Unknown;
      }
    }
  }

  static groupMachinesByClassification(machines: RoomMachine[]) {
    return machines.reduce<{
      [key in MachineClassification]: {
        washer: RoomMachine[];
        dryer: RoomMachine[];
      };
    }>((a, c) => (a[CSCGo.classifyMachine(c)][c.type].push(c), a), {
      available: {washer: [], dryer: []},
      inUse: {washer: [], dryer: []},
      finished: {washer: [], dryer: []},
      unknown: {washer: [], dryer: []},
    });
  }

  #apiURL(route = '') {
    return `https://mycscgo.com/api/v1/location/${this.locationID}${route}`;
  }
}

export enum MachineClassification {
  Available = 'available',
  InUse = 'inUse',
  Finished = 'finished',
  Unknown = 'unknown',
}

export type LocationSummary = {
  locationId: string;
  description: string;
  label: string;
  machineCount: number;
  washerCount: number;
  dryerCount: number;
  rooms: {
    locationId: string;
    roomId: string;
    description: string;
    label: string;
    machineCount: number;
    washerCount: number;
    dryerCount: number;
    connected: boolean;
    freePlay: boolean;
  }[];
};

export type RoomSummary = {
  locationId: string;
  locationLabel: string;
  roomId: string;
  roomLabel: string;
  isOnline: boolean;
  freePlay: boolean;
  washers: {available: number; total: number; soonest: number};
  dryers: {available: number; total: number; soonest: number};
};

export enum MachineType {
  Washer = 'washer',
  Dryer = 'dryer',
}

export type RoomMachine = {
  opaqueId: string;
  controllerType: string;
  type: MachineType;
  locationId: string;
  roomId: string;
  stickerNumber: number;
  licensePlate: string;
  nfcId: string;
  qrCodeId: string;
  doorClosed: boolean;
  available: boolean;
  notAvailableReason: NotAvailableReason | null;
  inService: boolean | null;
  freePlay: boolean;
  mode: MachineMode;
  display: string | null;
  timeRemaining: number;
  settings: {
    soil: SoilMode;
    cycle: CycleMode;
    washerTemp: WasherTemp;
    dryerTemp: DryerTemp;
  };
  capibility: {
    showSettings: boolean;
    addTime: boolean;
    showAddTimeNotice: boolean;
  };
  groupId: string | null;
  stackItems: null; // TODO
};

export enum MachineMode {
  Idle = 'idle',
  PressStart = 'pressStart',
  Running = 'running',
  EndOfCycle = 'endOfCycle',
  Unknown = 'unknown', // no idea when it would hit this but for some reason it is
}

export enum NotAvailableReason {
  InUse = 'inUse',
  Temporary = 'temporary',
  Offline = 'offline',
}

export enum SoilMode {
  Normal = 'normal',
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
}

export enum CycleMode {
  Normal = 'normal',
  PermPress = 'perm-press',
  Delicates = 'delicates',
}

export enum WasherTemp {
  Cold = 'cold',
  Warm = 'warm',
  Hot = 'hot',
}

export enum DryerTemp {
  HighTemp = 'high-temp',
  MedTemp = 'med-temp',
  LowTemp = 'low-temp',
  NoTemp = 'no-temp',
  Delicates = 'delicates',
}

export type AllRoomMachineStatuses = {
  location: LocationSummary;
  rooms: {[key: string]: RoomMachineStatuses};
  sortedRooms: [roomID: string, RoomMachineStatuses][];
};

export type RoomMachineStatuses = {
  [key in MachineType]: {
    [key in MachineClassification]: RoomMachine[];
  } & {total: number};
};
