import BetterSqlite3 from 'better-sqlite3';

export class Database {
  #db: BetterSqlite3.Database;

  constructor(dbFile: string) {
    this.#db = new BetterSqlite3(dbFile);
  }

  createMachineSubscription(user: string, machineID: number) {
    return this.#db
      .prepare(`
        insert into subscriptions (type, user_id, machine_id)
        values (0, ?, ?);
      `)
      .run(user, machineID);
  }

  deleteMachineSubscription(user: string, machineID: number) {
    return this.#db
      .prepare(`
        delete from subscriptions
        where
          type = 0
          and user_id = ?
          and machine_id = ?;
      `)
      .run(user, machineID);
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
    //const query = this.#db.prepare(`
    //  update kiosk_messages
    //  set last_update_hash = ?
    //  where
    //    message_id = ?
    //    and idx = ?
    //`);

    const updateMany = this.#db.transaction(
      (data: [hash: string, messageID: string, idx: number][]) => {
        for (const d of data) {
          //query.run(data[idx][0], data[idx][1], idx);
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
}

export enum SubscriptionType {
  Individual = 0,
  NextAvailable = 1,
}

// TODO: replace this with CSCGo MachineType?
export enum DBMachineType {
  Washer = 0,
  Dryer = 1,
}

export type Subscription = {
  id: number;
  user_id: string;
} & (
  | {
      type: SubscriptionType.Individual;
      // FIXME: database doesn't guarantee this to be not null, but it should always be. making that assumption here but it's unsafe (change this??)
      machine_id: number;
    }
  | {
      type: SubscriptionType.NextAvailable;
      // FIXME: database doesn't guarantee this to be not null, but it should always be. making that assumption here but it's unsafe (change this??)
      machine_type: 'W' | 'D';
    }
);

export type KioskMessage = {
  id: number;
  message_id: string;
  channel_id: string;
  guild_id: string;
  last_update_hash: string;
};
