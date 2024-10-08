import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption as StringOption,
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  MessageFlags,
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandInteractionDataNumberOption as NumberOption,
} from 'discord-api-types/v10';
import {Command} from '../interaction';
import type {Context} from '../interaction';
import assert from 'node:assert';
import {
  generateNotifySubscribeNextAvailableSuccessMessage,
  generateNotifySubscribeSpecificSuccessMessage,
} from '../room';
import type {MachineType} from '../../cscgo';
import {DBMachineTypeMap} from '../../db';
import {laundryRoomAutocomplate} from '../autocomplete/laundryRoom';
import {machineNumberAutocomplete} from '../autocomplete/machineNumber';

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

        ctx.db.createDiscordUser;
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
        return laundryRoomAutocomplate(ctx);
      }

      case 'machine-number': {
        return machineNumberAutocomplete(ctx);
      }

      default: {
        return;
      }
    }
  }
}
