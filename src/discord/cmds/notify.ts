import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption as StringOption,
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandInteractionDataNumberOption as NumberOption,
} from 'discord-api-types/v10';
import {Command} from '../interaction';
import type {Context} from '../interaction';
import assert from 'node:assert';
import {toRoomName} from '../../util/room';
import {capitalize} from '@benricheson101/util';
import {
  generateNotifySubscribeNextAvailableSuccessMessage,
  generateNotifySubscribeSpecificSuccessMessage,
} from '../room';
import {CSCGo, MachineClassification, type MachineType} from '../../cscgo';
import {DBMachineTypeMap} from '../../db';

// /notify-me clear
// /notify-me when-machine-finishes
// /notify-me when-dryer-is-available
// /notify-me when-washer-is-available

export class NotifyCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'notify-me',
    description: 'manage laundry notifications',

    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'clear',
        description: 'clear all pending laundry alerts',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'when-machine-finishes',
        description: 'notify me when a specific machine finishes',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'laundry-room',
            description: 'which laundry room the machine is in',
            autocomplete: true,
            required: true,
          },
          {
            type: ApplicationCommandOptionType.Number,
            name: 'machine-number',
            description: 'which machine to alert you about',
            autocomplete: true,
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'when-dryer-is-available',
        description: 'notify me when a dryer becomes available',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'laundry-room',
            description: 'which laundry room',
            autocomplete: true,
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'when-washer-is-available',
        description: 'notify me when a washer becomes available',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'laundry-room',
            description: 'which laundry room',
            autocomplete: true,
            required: true,
          },
        ],
      },
    ],
  };

  async run(ctx: Context<APIChatInputApplicationCommandInteraction>) {
    assert(
      ctx.i.data.options?.[0].type === ApplicationCommandOptionType.Subcommand
    );

    const subcmd = ctx.i.data.options[0];

    switch (subcmd.name) {
      case 'clear': {
        ctx.db.deleteUserSubscriptions(ctx.user.id);

        ctx.send({
          content: ':white_check_mark: Alerts cleared!',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      case 'when-machine-finishes': {
        const laundryRoom = ctx.getOption<StringOption>('laundry-room').value;
        const machineNumber =
          ctx.getOption<NumberOption>('machine-number').value;

        if (
          !(laundryRoom in ctx.cscgo.machines) ||
          !ctx.cscgo.machines[laundryRoom].some(
            r => r.stickerNumber === machineNumber
          )
        ) {
          ctx.send({
            content: `:x: Could not find machine #${machineNumber}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const machine = ctx.cscgo.machines[laundryRoom].find(
          r => r.stickerNumber === machineNumber
        )!;

        ctx.db.createMachineSubscription(
          ctx.user.id,
          machineNumber,
          laundryRoom
        );
        ctx.send(
          generateNotifySubscribeSpecificSuccessMessage(
            machineNumber,
            machine.type
          )
        );

        return;
      }

      case 'when-washer-is-available':
      case 'when-dryer-is-available': {
        const kind = subcmd.name.split('-')[1] as 'washer' | 'dryer';
        const laundryRoom = ctx.getOption<StringOption>('laundry-room').value;

        if (!(laundryRoom in ctx.cscgo.machines)) {
          ctx.send({
            content: `:x: Could not find laundry room ${laundryRoom}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        ctx.db.createNextAvailableSubscription(
          ctx.user.id,
          DBMachineTypeMap[kind],
          laundryRoom
        );

        ctx.send(
          generateNotifySubscribeNextAvailableSuccessMessage(
            kind as MachineType
          )
        );

        return;
      }
    }
  }

  async autocomplete(
    ctx: Context<APIApplicationCommandAutocompleteInteraction>
  ) {
    const focused = ctx.getFocusedOption();
    if (!focused) {
      return;
    }

    switch (focused.name) {
      case 'laundry-room': {
        assert(focused.type === ApplicationCommandOptionType.String);
        const query = focused.value;

        const location = ctx.cscgo.location;
        const rooms = location.rooms
          .map(r => ({name: toRoomName(r), value: r.roomId}))
          .filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
          .toSorted((a, b) => (a.name < b.name ? -1 : 1))
          .slice(0, 25);

        ctx.respond({
          type: InteractionResponseType.ApplicationCommandAutocompleteResult,
          data: {
            choices: rooms,
          },
        });

        return;
      }

      case 'machine-number': {
        assert(focused.type === ApplicationCommandOptionType.Number);

        const roomID = ctx.getOption<StringOption | undefined>(
          'laundry-room'
        )?.value;
        const query = focused.value;

        const room = ctx.cscgo.machines;

        if (roomID && roomID in room) {
          const roomMachines = await ctx.cscgo.getRoomMachines(roomID);
          const rm = roomMachines.filter(
            m =>
              CSCGo.classifyMachine(m) === MachineClassification.InUse &&
              m.stickerNumber.toString().includes(query.toString())
          );

          const machines = rm
            .toSorted((a, b) => a.stickerNumber - b.stickerNumber)
            .map(m => ({
              name: `${capitalize(m.type)} #${m.stickerNumber} (${m.timeRemaining}m remaining)`,
              value: m.stickerNumber,
            }));

          ctx.respond({
            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
            data: {
              choices: machines,
            },
          });
          return;
        }

        ctx.respond({
          type: InteractionResponseType.ApplicationCommandAutocompleteResult,
          data: {
            choices: [],
          },
        });
        return;
      }

      default: {
        return;
      }
    }
  }
}
