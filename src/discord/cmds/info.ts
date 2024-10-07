import type {
  APIApplicationCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import {Command} from '../interaction';
import type {Context} from '../interaction';

const SUPPORT_DISCORD = 'https://discord.gg/GmaW9dYwZf';
const GITHUB_URL = 'https://github.com/Benricheson101/csc-go-laundry-discord';
const GIT_REVISION = process.env.GIT_COMMIT || 'unknown';

export class InfoCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'info',
    description: 'shows info about the bot',
  };

  async run(ctx: Context<APIApplicationCommandInteraction>) {
    const msg = [
      `**Source Code**: <${GITHUB_URL}>`,
      `**Version**: [${GIT_REVISION}](<${GITHUB_URL}${GIT_REVISION === 'unknown' ? '' : `/tree/${GIT_REVISION}`}>)`,

      `-# Need help? Join my [support Discord server](${SUPPORT_DISCORD}) and send me a message`,
    ].join('\n');

    return ctx.send({
      content: msg,
    });
  }
}
