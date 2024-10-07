import {
  ApplicationCommandOptionType,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataStringOption as StringOption,
  type RESTPostAPIApplicationCommandsJSONBody,
  MessageFlags,
} from 'discord-api-types/v10';
import {Command, type Context} from '../interaction';
import {laundryRoomAutocomplate} from '../autocomplete/laundryRoom';
import {generateViewRoomMessage} from '../room';

export class RoomCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'view-room',
    description: 'view status of a room',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'laundry-room',
        description: 'which laundry room to view',
        autocomplete: true,
        required: true,
      },
    ],
  };

  async run(ctx: Context<APIApplicationCommandInteraction>) {
    const laundryRoom = ctx.getOption<StringOption>('laundry-room').value;

    if (!(laundryRoom in ctx.cscgo.machines)) {
      ctx.send({
        content: `:x: Could not find laundry room ${laundryRoom}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [roomSummary, roomMachines] = await Promise.all([
      ctx.cscgo.getRoomSummary(laundryRoom),
      ctx.cscgo.getRoomMachines(laundryRoom),
    ]);

    ctx.send(generateViewRoomMessage(roomSummary, roomMachines));
  }

  async autocomplete(
    ctx: Context<APIApplicationCommandAutocompleteInteraction>
  ): Promise<void> {
    return laundryRoomAutocomplate(ctx);
  }
}
