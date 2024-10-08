import {
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import {Command, type Context} from '../interaction';
import {KioskService} from '../../svc/kiosk';

export class KioskCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'kiosk',
    description: 'manage auto-updating kiosk messages',
    default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'new',
        description: 'create a kiosk message in the currently-open channel',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'clear',
        description: 'remove all kiosk messages from the server',
      },
    ],
  };

  async run(ctx: Context<APIChatInputApplicationCommandInteraction>) {
    const subcmd = ctx.i.data.options![0];

    switch (subcmd.name) {
      case 'new': {
        if (ctx.db.hasKioskMessages(ctx.i.channel.id)) {
          ctx.send({
            content:
              ':x: This channel already has kiosk messages.\n-# If you want to replace them, use `/kiosk clear` followed by `/kiosk new`',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        ctx.respond({
          type: InteractionResponseType.DeferredChannelMessageWithSource,
          data: {
            flags: MessageFlags.Ephemeral,
          },
        });

        const data =
          ctx.cscgo.lastAllRoomMachineStatuses ||
          (await ctx.cscgo.getAllRoomMachineStatuses());
        const [msgContents, hashes] = KioskService.generateKioskMessages(data);

        for (const i in msgContents) {
          const sent = await ctx.dapi.sendMsg(ctx.i.channel.id, msgContents[i]);
          ctx.db.createKioskMessage(
            sent.id,
            sent.channel_id,
            ctx.i.guild_id!,
            hashes[i],
            Number(i)
          );
        }

        await ctx.update({
          content: ':white_check_mark: Successfully configured kiosk!',
        });

        break;
      }

      case 'clear': {
        ctx.db.deleteAllKioskMessages(ctx.i.guild_id!);

        ctx.send({
          content: ':white_check_mark: Kiosk messages cleared',
          flags: MessageFlags.Ephemeral,
        });

        break;
      }
    }
  }
}
