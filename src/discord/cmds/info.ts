import {execSync} from 'node:child_process';
import type {
  APIApplicationCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import {Command} from '../interaction';
import type {Context} from '../interaction';

const SUPPORT_DISCORD = 'https://discord.gg/GmaW9dYwZf';
const GITHUB_URL = 'https://github.com/Benricheson101/csc-go-laundry-discord';

let gitRevision: string;
try {
  gitRevision = execSync('git rev-parse --short HEAD').toString().trim();
} catch (err) {
  gitRevision = 'unknown';
}

export class InfoCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'info',
    description: 'shows info about the bot',
  };

  async run(ctx: Context<APIApplicationCommandInteraction>) {
    const msg = [
      `**Source Code**: <${GITHUB_URL}>`,
      `**Version**: [${gitRevision}](<${GITHUB_URL}${gitRevision === 'unknown' ? '' : `/tree/${gitRevision}`}>)`,

      `-# Need help? Join my [support Discord server](${SUPPORT_DISCORD}) and send me a message`,
    ].join('\n');

    return ctx.send({
      content: msg,
    });
  }
}
