import {
  type APIActionRowComponent,
  type APIEmbed,
  type APIMessageActionRowComponent,
  ComponentType,
  type RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';

import type {AllRoomMachineStatuses, LocationSummary} from '../cscgo';
import {toRoomName} from '../util/room';

export const generateKioskMessage = (
  data: AllRoomMachineStatuses
): RESTPostAPIChannelMessageJSONBody => {
  const rooms = data.location.rooms.reduce<{
    [key: string]: LocationSummary['rooms'][number];
  }>(
    (a, c) =>
      c.roomId in data.rooms && c.connected ? ((a[c.roomId] = c), a) : a,
    {}
  );

  const embed: APIEmbed = {
    title: 'Laundry Status',
    color: 0x54b25d,
    author: {
      name: data.location.label,
    },
    fields: data.sortedRooms.map(([room, status]) => ({
      name: toRoomName(rooms[room]!),
      inline: true,
      value: [
        `Washers: **${status.washer.available.length}/${status.washer.total}** available`,
        `Dryers: **${status.dryer.available.length}/${status.dryer.total}** available`,
        `[View Online](https://mycscgo.com/laundry/summary/${data.location.locationId}/${room})`,
      ].join('\n'),
    })),
    footer: {
      text: `Updates every ${Math.round(Number(process.env.INTERVAL))}s`,
    },
  };

  const add = 3 - (embed.fields!.length % 3);
  embed.fields!.push(
    ...Array.from({length: add}, () => ({
      name: '\u200b',
      value: '\u200b',
      inline: true,
    }))
  );

  const components: APIActionRowComponent<APIMessageActionRowComponent>[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: 'room_summary',
          placeholder: 'View a Room',
          options: Object.entries(rooms)
            .map(([id, room]) => ({
              label: toRoomName(room),
              value: id,
            }))
            .toSorted((a, b) => (a.label < b.label ? -1 : 1)),
        },
      ],
    },
  ];

  return {embeds: [embed], components};
};
