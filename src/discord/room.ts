import {
  ComponentType,
  type APIActionRowComponent,
  type APIEmbed,
  type APIMessageActionRowComponent,
  type RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';

import {CSCGo, type MachineType, type RoomMachine, type RoomSummary} from '../cscgo';
import {toRoomName} from '../util/room';
import {capitalize} from '@benricheson101/util';

export const generateViewRoomMessage = (
  room: RoomSummary,
  machines: RoomMachine[]
): RESTPostAPIChannelMessageJSONBody => {
  const machineCls = CSCGo.groupMachinesByClassification(machines);

  console.log(machineCls);

  const mapToNr = (o: RoomMachine[]) =>
    o
      .toSorted((a, b) => a.stickerNumber - b.stickerNumber)
      .map(a => `#${a.stickerNumber}`)
      .join(', ');

  const embed: APIEmbed = {
    title: `${toRoomName({label: room.roomLabel, roomId: room.roomId})} Laundry Room`,
    color: 0x54b25d,
    description: [
      '— Washers —',
      `**Available:** ${mapToNr(machineCls.available.washer)}`,
      `**Finished:** ${mapToNr(machineCls.finished.washer)}`,
      '**In Use:**',
      machineCls.inUse.washer
        .toSorted((a, b) => a.timeRemaining - b.timeRemaining)
        .map(
          m =>
            `- #${m.stickerNumber} (done <t:${Math.floor(Date.now() / 1_000) + m.timeRemaining * 60}:R>)`
        )
        .join('\n'),

      '— Dryers —',
      `**Available:** ${mapToNr(machineCls.available.dryer)}`,
      `**Finished:** ${mapToNr(machineCls.finished.dryer)}`,
      '**In Use:**',
      machineCls.inUse.dryer
        .toSorted((a, b) => a.timeRemaining - b.timeRemaining)
        .map(
          m =>
            `- #${m.stickerNumber} (done <t:${Math.floor(Date.now() / 1_000) + m.timeRemaining * 60}:R>)`
        )
        .join('\n'),
    ].join('\n'),
  };
  const components: APIActionRowComponent<APIMessageActionRowComponent>[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: 'notifyblah',
          placeholder: 'Notify me...',
          options: [
            {
              label: '...when my machine finishes',
              value: 'specific',
              description:
                'Receive a notification when a specific machine finishes',
            },
            {
              label: '...when a dryer is available',
              value: 'dryer',
              description:
                'Receive a notification when a dryer becomes available',
            },
            {
              label: '...when a washer is available',
              value: 'washer',
              description:
                'Receive a notification when a washer becomes available',
            },
          ],
        },
      ],
    },
  ];

  // const components: APIActionRowComponent<APIMessageActionRowComponent>[] = [
  //   {
  //     type: ComponentType.ActionRow,
  //     components: [
  //       {
  //         type: ComponentType.Button,
  //         style: ButtonStyle.Secondary,
  //         label: 'Notify me when a specific machine finishes',
  //         custom_id: `notify_specific_${room.roomId}`,
  //         emoji: {
  //           name: String.fromCodePoint(0x1f514),
  //         },
  //       },
  //       // {
  //       //   type: ComponentType.Button,
  //       //   style: ButtonStyle.Secondary,
  //       //   label: 'Notify Me...',
  //       //   custom_id: `notify_${room.roomId}`,
  //       // },
  //     ],
  //   },
  //   {
  //     type: ComponentType.ActionRow,
  //     components: [
  //       {
  //         type: ComponentType.Button,
  //         style: ButtonStyle.Secondary,
  //         // label: 'Notify me when the next washer becomes available',
  //         label: 'Notify me when a washer is available',
  //         custom_id: `notify_next_washer_${room.roomId}`,
  //         emoji: {
  //           name: String.fromCodePoint(0x1f514),
  //         },
  //       },
  //     ],
  //   },
  //   {
  //     type: ComponentType.ActionRow,
  //     components: [
  //       {
  //         type: ComponentType.Button,
  //         style: ButtonStyle.Secondary,
  //         label: 'Notify me when a dryer is available',
  //         custom_id: `notify_next_${room.roomId}`,
  //         emoji: {
  //           name: String.fromCodePoint(0x1f514),
  //         },
  //       },
  //     ],
  //   },
  // ];

  return {embeds: [embed], components};
};

export const generateNotifyMeMessage = (
  room: RoomSummary,
  machines: RoomMachine[]
): RESTPostAPIChannelMessageJSONBody => {
  const machineCls = CSCGo.groupMachinesByClassification(machines);

  const inUse = [...machineCls.inUse.washer, ...machineCls.inUse.dryer];

  const components: APIActionRowComponent<APIMessageActionRowComponent>[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: `notify_specific_${room.roomId}`,
          placeholder: 'Which machine would you like to be notified about?',
          options: inUse.length
            ? inUse.map(m => ({
                label: `${capitalize(m.type)} #${m.stickerNumber} (${m.timeRemaining}m remaining)`,
                value: `notify_specific_${room.roomId}_${m.type}_${m.stickerNumber}`,
                // emoji // TODO: washer/dryer emoji?
              }))
            : [{label: 'No Machines Running!', value: 'na'}],

          disabled: !inUse.length,
        },
      ],
    },
  ];

  return {
    content: 'Which machine would you like to subscribe to?',
    components,
  };
};

export const generateNotifySubscribeSuccessMessage = (
  machineNr: number,
  machineType: MachineType
): RESTPostAPIChannelMessageJSONBody => ({
  content: [
    `:white_check_mark: I'll notify you when **${machineType} #${machineNr}** is finished!`,
    '-# Make sure you have your DMs enabled!',
  ].join('\n'),
});
