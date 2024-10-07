import assert from 'node:assert';
import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption as StringOption,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from 'discord-api-types/v10';

import type {Context} from '../interaction';
import {CSCGo, MachineClassification} from '../../cscgo';
import {capitalize} from '@benricheson101/util';

export const machineNumberAutocomplete = async (
  ctx: Context<APIApplicationCommandAutocompleteInteraction>
) => {
  const focused = ctx.getFocusedOption();
  if (!focused) {
    return;
  }

  assert(focused.type === ApplicationCommandOptionType.Number);

  const roomID = ctx.getOption<StringOption | undefined>('laundry-room')?.value;
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
};
