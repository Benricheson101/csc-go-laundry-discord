CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE subscriptions (
  id integer primary key,
  user_id varchar(20) not null,

  -- type 0: subscribe to individual machine
  -- type 1: subscribe to next-available updates
  type int not null check (type in (0, 1)),

  -- TODO: is there some kind of index I can do to make sure these aren't null when they shouldn't be?
  machine_id integer,
  room_id varchar(11),
  machine_type int check (machine_type in (0, 1))
);
CREATE UNIQUE INDEX only_one_0_subscription
on subscriptions(user_id, machine_id)
where type = 0;
CREATE UNIQUE INDEX only_one_1_subscription
on subscriptions(user_id, machine_type)
where type = 1;
CREATE TABLE kiosk_messages (
  id integer primary key,
  message_id varchar(20) not null,
  channel_id varchar(20) not null,
  idx integer not null,

  last_update_hash char(40),

  unique(channel_id, idx)
);
CREATE INDEX kiosk_hash on kiosk_messages(last_update_hash);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20240830203103');
