# CSCGo Discord :tshirt:

A live feed of a CSCGo campus laundry system in Discord! Featuring:

- auto-updating kiosk-style message
- notifications
- room statuses

## Demo

<details open>
    <summary>Live status of all laundry rooms on campus</summary>

![kiosk](/screenshots/kiosk.png)
</details>

<details open>
    <summary>Current view of a laundry room</summary>

![room view](/screenshots/view-room.png)
</details>

<details open>
    <summary>Interactive menus for creating notifications</summary>

![notify](/screenshots/notify.png)
![notifications](/screenshots/notification.png)
</details>

## Installing

> [!WARNING]
> This project uses undocumented APIs that could change at any time.

1. [Create an application on Discord](https://discord.com/developers/applications)
2. Set up `.env` according to [/src/types/node.ts](/src/types/node.ts)
3. `docker compose up -d`
4. OPTIONAL: set up `room_rename.json` to rename any rooms

> [!IMPORTANT]
> Be mindful when setting `INTERVAL`. Because the API is not documented, I do not know what kinds of rate limits or anti-abuse systems are in place. Too short of an interval with a large number of laundry rooms may cause issues.

## Goals

- [x] commands in discord to show current machine statuses
- [x] embeds in discord that auto-update to show machine statuses. bottom could show last 5 events or something
- [x] commands in discord to subscribe to updates
- [x] ability to subscribe to washer in discord and get notifications
    - machine finished
    - machine available

## Non-Goals
- [ ] anything related to payment
