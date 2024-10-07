import BetterSqlite3 from 'better-sqlite3';
import {isNumber} from 'node:util';

// TODO: make prepared queries constants?

export class Database {
  #db: BetterSqlite3.Database;

  constructor(dbFile: string) {
    this.#db = new BetterSqlite3(dbFile);
  }

  createMachineSubscription(user: string, machineID: number, roomID: string) {
    if (
      !(
        user &&
        typeof machineID === 'number' &&
        !Number.isNaN(machineID) &&
        roomID
      )
    ) {
      throw new DatabaseError('invalid inputs to CreateMachineSubscription', {
        user,
        machineID,
        roomID,
      });
    }

    return this.#db
      .prepare(`
        insert into subscriptions (type, user_id, machine_id, room_id)
        values (?, ?, ?, ?);
      `)
      .run(SubscriptionType.Machine, user, machineID, roomID);
  }

  deleteSubscription(id: number) {
    return this.#db
      .prepare(`
        delete from subscriptions
        where id = ?
      `)
      .run(id);
  }

  getMachineSubscriptionsForMachine(machineID: number): Subscription[] {
    return this.#db
      .prepare(`
        select *
        from subscriptions
        where
          type = 0
          and machine_id = ?;
      `)
      .all(machineID) as Subscription[];
  }

  getMachineSubscriptionsForUser(user: string): Subscription[] {
    return this.#db
      .prepare(`
        select *
        from subscriptions
        where
          type = 0
          and user_id = ?;
      `)
      .all(user) as Subscription[];
  }

  createNextAvailableSubscription(
    user: string,
    kind: DBMachineType,
    roomID: string
  ) {
    if (!(user && [0, 1].includes(kind) && roomID)) {
      throw new DatabaseError('invalid inputs to CreateMachineSubscription', {
        user,
        kind,
        roomID,
      });
    }

    return this.#db
      .prepare(`
        insert into subscriptions (type, user_id, machine_type, room_id)
        values (?, ?, ?, ?);
      `)
      .run(SubscriptionType.NextAvailable, user, kind, roomID);
  }

  getActiveSubscriptions() {
    return this.#db
      .prepare(`
      select s.*, du.dm_channel_id
      from subscriptions s
      inner join discord_users du
      on s.user_id = du.id
    `)
      .all() as Subscription[];
  }

  createKioskMessage(
    messageID: string,
    channelID: string,
    // guildID: string,
    hash: string,
    idx: number
  ) {
    return this.#db
      .prepare(`
        insert into kiosk_messages(message_id, channel_id, last_update_hash, idx)
        values (?, ?, ?, ?);
      `)
      .run(messageID, channelID, hash, idx);
  }

  getKioskMessage(messageID: string, channelID: string) {
    return this.#db
      .prepare(`
        select *
        from kiosk_messages
        where
          message_id = ?
          and channel_id = ?;
      `)
      .get(messageID, channelID) as KioskMessage | null;
  }

  getOutdatedKioskMessage(hash: string, idx: number) {
    return this.#db
      .prepare(`
        select *
        from kiosk_messages
        where last_update_hash != ?
        and idx = ?;
      `)
      .all(hash, idx) as KioskMessage[];
  }

  getMissingKioskMessages(msgs: number) {
    return this.#db
      .prepare(`
      with tbl(idx) as (
        values ${Array.from({length: msgs}, (_, i) => `(${i})`).join(',')}
      )
      select
        tbl.idx,
        km.channel_id
      from kiosk_messages km, tbl
      where
        tbl.idx not in (
          select idx
          from kiosk_messages km2
          where km2.channel_id = km.channel_id
        );
    `)
      .all() as {idx: number; channel_id: string}[];
  }

  updateKioskMessageHash(hash: string, messageID: string, idx: number) {
    return this.#db
      .prepare(`
        update kiosk_messages
        set last_update_hash = ?
        where
          message_id = ?
          and idx = ?
      `)
      .run(hash, messageID, idx);
  }

  updateManyKioskMessageHashes(
    data: [hash: string, messageID: string, idx: number][]
  ) {
    const updateMany = this.#db.transaction(
      (data: [hash: string, messageID: string, idx: number][]) => {
        for (const d of data) {
          this.updateKioskMessageHash(...d);
        }
      }
    );

    console.log('updating', data);

    return updateMany(data);
  }

  deleteKioskMessage(messageID: string, channelID: string, guildID: string) {
    return this.#db
      .prepare(`
        delete from kiosk_messages
        where
          message_id = ?
          and channel_id = ?
          and guild_id = ?;
      `)
      .run(messageID, channelID, guildID);
  }

  hasDMChannelID(userID: string) {
    return (
      this.#db
        .prepare<[string], {has_dm_channel_id: boolean}>(`
        select dm_channel_id is not null as has_dm_channel_id
        from discord_users
        where id = ?
      `)
        .get(userID)?.has_dm_channel_id || false
    );
  }

  setDMChannelID(userID: string, dmChannelID: string) {
    return this.#db
      .prepare(`
        update discord_users
        set dm_channel_id = ?
        where id = ?;
      `)
      .run(userID, dmChannelID);
  }
}

export enum SubscriptionType {
  Machine = 0,
  NextAvailable = 1,
}

// TODO: replace this with CSCGo MachineType?
export enum DBMachineType {
  Washer = 0,
  Dryer = 1,
}

type MakeSubscription<Type extends SubscriptionType, Data> = {
  id: number;
  user_id: string;
  room_id: string;
  dm_channel_id?: string;
  type: Type;
} & Data;

export type MachineSubscription = MakeSubscription<
  SubscriptionType.Machine,
  {
    machine_id: number;
  }
>;

export type NextAvailableSubscription = MakeSubscription<
  SubscriptionType.NextAvailable,
  {
    machine_type: DBMachineType;
  }
>;

export type Subscription = MachineSubscription | NextAvailableSubscription;

export type KioskMessage = {
  id: number;
  message_id: string;
  channel_id: string;
  guild_id: string;
  last_update_hash: string;
};

export const DBMachineTypeMap = {
  [DBMachineType.Washer]: 'washer',
  [DBMachineType.Dryer]: 'dryer',
  washer: DBMachineType.Washer,
  dryer: DBMachineType.Dryer,
} as const;

export class DatabaseError extends Error {
  constructor(
    msg: string,
    readonly meta: unknown
  ) {
    super(msg);
  }
}
