import assert from 'node:assert';
import {
  type APIApplicationCommandAutocompleteInteraction,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from 'discord-api-types/v10';
import {toRoomName} from '../../util/room';
import type {Context} from '../interaction';

export const laundryRoomAutocomplate = (
  ctx: Context<APIApplicationCommandAutocompleteInteraction>
) => {
  const focused = ctx.getFocusedOption();
  if (!focused) {
    return;
  }

  assert(focused.type === ApplicationCommandOptionType.String);
  const query = focused.value;

  const location = ctx.cscgo.location;
  const rooms = location.rooms
    .filter(r => r.connected)
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
};
