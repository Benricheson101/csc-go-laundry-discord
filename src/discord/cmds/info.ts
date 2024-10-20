import {
  type APIApplicationCommandInteraction,
  InteractionContextType,
  MessageFlags,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import {Command, type Context} from '../interaction';

const AUTHOR = '[@index.ts](<https://discord.com/users/255834596766253057>)';
const SUPPORT_DISCORD = 'https://discord.gg/GmaW9dYwZf';
const GITHUB_URL = 'https://github.com/Benricheson101/csc-go-laundry-discord';
const GIT_REVISION = process.env.GIT_COMMIT?.slice(0, 7) || 'unknown';

export class InfoCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'info',
    description: 'shows info about the bot',
    contexts: [
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ],
  };

  async run(ctx: Context<APIApplicationCommandInteraction>) {
    const msg = [
      `**Author**: ${AUTHOR}`,
      `**Source Code**: <${GITHUB_URL}>`,
      `**Version**: [${GIT_REVISION}](<${GITHUB_URL}${GIT_REVISION === 'unknown' ? '' : `/tree/${GIT_REVISION}`}>)`,

      `-# Need help? Join my [support Discord server](${SUPPORT_DISCORD}) and send me a message`,
    ].join('\n');

    return ctx.send({
      content: msg,
      flags: MessageFlags.Ephemeral,
      allowed_mentions: {parse: []},
    });
  }
}
