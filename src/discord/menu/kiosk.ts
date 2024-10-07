import {
  MessageFlags,
  type APIMessageComponentSelectMenuInteraction,
} from 'discord-api-types/v10';
import {type Context, SelectMenu} from '../interaction';
import {generateViewRoomMessage} from '../room';

export class KioskRoomSelectMenu extends SelectMenu {
  matches = 'room_summary';

  async run(ctx: Context<APIMessageComponentSelectMenuInteraction>) {
    const selected = ctx.i.data.values[0];

    const [roomSummary, roomMachines] = await Promise.all([
      ctx.cscgo.getRoomSummary(selected),
      ctx.cscgo.getRoomMachines(selected),
    ]);

    ctx.send(generateViewRoomMessage(roomSummary, roomMachines));
  }
}
