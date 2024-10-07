import {
  ComponentType,
  MessageFlags,
  type APIActionRowComponent,
  type APIEmbed,
  type APIMessageActionRowComponent,
  type RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import {capitalize} from '@benricheson101/util';

import {
  CSCGo,
  type MachineType,
  type RoomMachine,
  type RoomSummary,
} from '../cscgo';
import {toRoomName} from '../util/room';

export const generateViewRoomMessage = (
  room: RoomSummary,
  machines: RoomMachine[]
): RESTPostAPIChannelMessageJSONBody => {
  const machineCls = CSCGo.groupMachinesByClassification(machines);

  const mapToNr = (o: RoomMachine[]) =>
    o
      .toSorted((a, b) => a.stickerNumber - b.stickerNumber)
      .map(a => `#${a.stickerNumber}`)
      .join(', ');

  const mapMachines = (kind: 'washer' | 'dryer') => {
    return [
      `**Available:** ${mapToNr(machineCls.available[kind])}`,
      `**Finished:** ${mapToNr(machineCls.finished[kind])}`,
      '**In Use:**',
      machineCls.inUse[kind]
        .toSorted((a, b) => a.timeRemaining - b.timeRemaining)
        .map(
          m =>
            `- #${m.stickerNumber} (done <t:${Math.floor(Date.now() / 1_000) + m.timeRemaining * 60}:R>)`
        )
        .join('\n'),
    ];
  };

  const embed: APIEmbed = {
    title: `${toRoomName({label: room.roomLabel, roomId: room.roomId})} Laundry Room`,
    color: 0x54b25d,
    description: [
      '— Washers —',
      ...mapMachines('washer'),

      '— Dryers —',
      ...mapMachines('dryer'),
    ].join('\n'),
  };
  const components: APIActionRowComponent<APIMessageActionRowComponent>[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: `notifyme_${room.roomId}`,
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

  return {embeds: [embed], components, flags: MessageFlags.Ephemeral};
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
          placeholder: inUse.length
            ? 'Choose a machine...'
            : 'No machines are currently running!',
          options: inUse.length
            ? inUse
                // TODO: should this use sticker number or time remaining? sticker makes more sense but
                // the embed uses time remaining so it's weird to have different orders
                //.toSorted((a, b) => a.stickerNumber - b.stickerNumber)
                .toSorted((a, b) => a.timeRemaining - b.timeRemaining)
                .map(m => ({
                  label: `${capitalize(m.type)} #${m.stickerNumber} (${m.timeRemaining}m remaining)`,
                  value: `${m.type}_${m.stickerNumber}`,
                  // emoji // TODO: washer/dryer emoji?
                }))
            : [{label: 'No Machines Running!', value: 'na'}],

          disabled: !inUse.length,
        },
      ],
    },
  ];

  return {
    components,
    content: 'Which machine would you like to subscribe to?',
    flags: MessageFlags.Ephemeral,
    embeds: [],
  };
};

export const generateNotifySubscribeNextAvailableSuccessMessage = (
  machineType: MachineType
): RESTPostAPIChannelMessageJSONBody => ({
  flags: MessageFlags.Ephemeral,
  content: [
    `:white_check_mark: I'll notify you when the next **${machineType}** becomes available!`,
    '-# Make sure you have your DMs enabled!',
  ].join('\n'),
  components: [],
  embeds: [],
});

export const generateNotifySubscribeSpecificSuccessMessage = (
  machineNr: number,
  machineType: MachineType
): RESTPostAPIChannelMessageJSONBody => ({
  flags: MessageFlags.Ephemeral,
  content: [
    `:white_check_mark: I'll notify you when **${machineType} #${machineNr}** is finished!`,
    '-# Make sure you have your DMs enabled!',
  ].join('\n'),
  components: [],
  embeds: [],
});
