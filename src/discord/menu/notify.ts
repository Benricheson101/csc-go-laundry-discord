import {SqliteError} from 'better-sqlite3';
import {
  type APIMessageComponentSelectMenuInteraction,
  MessageFlags,
} from 'discord-api-types/v10';

import type {MachineType} from '../../cscgo';
import {DBMachineTypeMap} from '../../db';
import {type Context, SelectMenu} from '../interaction';
import {
  generateNotifyMeMessage,
  generateNotifySubscribeNextAvailableSuccessMessage,
  generateNotifySubscribeSpecificSuccessMessage,
} from '../room';

export class NotifyMeSelectMenu extends SelectMenu {
  matches = 'notifyme';

  async run(ctx: Context<APIMessageComponentSelectMenuInteraction>) {
    const [, roomID] = ctx.i.data.custom_id.split('_');
    const value = ctx.i.data.values[0] as 'specific' | 'dryer' | 'washer';

    const updateMsg = !!(ctx.i.message.flags! & MessageFlags.Ephemeral);

    switch (value) {
      case 'specific': {
        const [roomSummary, roomMachines] = await Promise.all([
          ctx.cscgo.getRoomSummary(roomID),
          ctx.cscgo.getRoomMachines(roomID),
        ]);

        const msg = generateNotifyMeMessage(roomSummary, roomMachines);
        if (updateMsg) {
          ctx.update(msg);
        } else {
          ctx.send(msg);
        }

        return;
      }

      case 'dryer':
      case 'washer': {
        ctx.db.createNextAvailableSubscription(
          (ctx.i.member?.user || ctx.i.user)!.id,
          DBMachineTypeMap[value],
          roomID
        );

        const msg = generateNotifySubscribeNextAvailableSuccessMessage(
          value as MachineType
        );

        if (updateMsg) {
          ctx.update(msg);
        } else {
          ctx.send(msg);
        }

        if (!ctx.db.hasDMChannelID(ctx.user.id)) {
          const dmChannel = await ctx.dapi.createDM(ctx.user.id);
          ctx.db.setDMChannelID(ctx.user.id, dmChannel.id);
        }

        return;
      }
    }
  }
}

export class NotifyMeSpecificMenu extends SelectMenu {
  matches = 'notify_specific';

  async run(ctx: Context<APIMessageComponentSelectMenuInteraction>) {
    const [, , roomID] = ctx.i.data.custom_id.split('_');
    const [type, stickerNumber] = ctx.i.data.values[0].split('_');

    try {
      ctx.db.createMachineSubscription(
        ctx.user.id,
        Number(stickerNumber),
        roomID
      );
      if (!ctx.db.hasDMChannelID(ctx.user.id)) {
        const dmChannel = await ctx.dapi.createDM(ctx.user.id);
        ctx.db.setDMChannelID(ctx.user.id, dmChannel.id);
      }
    } catch (err) {
      if (err instanceof SqliteError) {
        if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
          ctx.send({
            content: ':x: An error occurred.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      } else {
        console.error(err);
      }
    }

    ctx.update(
      generateNotifySubscribeSpecificSuccessMessage(
        Number(stickerNumber),
        type as MachineType
      )
    );
  }
}
