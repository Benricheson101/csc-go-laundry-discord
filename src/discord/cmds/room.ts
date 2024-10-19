import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
  ApplicationCommandOptionType,
  MessageFlags,
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandInteractionDataStringOption as StringOption,
} from 'discord-api-types/v10';
import {laundryRoomAutocomplate} from '../autocomplete/laundryRoom';
import {Command, type Context} from '../interaction';
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

    const msg = generateViewRoomMessage(roomSummary, roomMachines);
    msg.flags! &= ~MessageFlags.Ephemeral;

    ctx.send(msg);
  }

  async autocomplete(
    ctx: Context<APIApplicationCommandAutocompleteInteraction>
  ): Promise<void> {
    return laundryRoomAutocomplate(ctx);
  }
}
