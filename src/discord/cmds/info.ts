import type {
  APIApplicationCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import {Command} from '../interaction';
import type {Context} from '../interaction';

export class InfoCommand extends Command {
  meta: RESTPostAPIApplicationCommandsJSONBody = {
    name: 'info',
    description: 'shows info about the bot',
  };

  skip = false;

  async run(ctx: Context<APIApplicationCommandInteraction>) {
    return ctx.send({
      content: 'beep',
    });
  }
}
