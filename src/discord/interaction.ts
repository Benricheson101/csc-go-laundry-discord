import type {ServerResponse} from 'node:http';
import {
  APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataOption,
  APIApplicationCommandOption,
  type APIInteraction,
  type APIInteractionResponse,
  type APIInteractionResponseCallbackData,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import type {Database} from '../db';
import type {CSCGo} from '../cscgo';
import type {DiscordAPI} from './api';
import type {Logger} from '../util/logger';
import assert from 'node:assert';

export class Context<T extends APIInteraction> {
  hasResponded = false;

  constructor(
    readonly i: T,
    readonly res: ServerResponse,
    readonly db: Database,
    readonly dapi: DiscordAPI,
    readonly cscgo: CSCGo,
    readonly logger: Logger
  ) {}

  get user(): APIUser {
    return (this.i.member?.user || this.i.user)!;
  }

  async respond(msg: APIInteractionResponse) {
    if (!this.hasResponded) {
      this.res
        .setHeader('content-type', 'application/json')
        .writeHead(200)
        .end(JSON.stringify(msg));
      this.hasResponded = true;
      return;
    }

    await this.dapi.respondInteraction(this.i, msg);
  }

  async send(msg: APIInteractionResponseCallbackData) {
    return this.respond({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: msg,
    });
  }

  async update(msg: APIInteractionResponseCallbackData) {
    return this.respond({
      type: InteractionResponseType.UpdateMessage,
      data: msg,
    });
  }

  getOptions() {
    assert(
      (this.i.type === InteractionType.ApplicationCommand ||
        this.i.type === InteractionType.ApplicationCommandAutocomplete) &&
        this.i.data.type === ApplicationCommandType.ChatInput
    );

    const opts = this.i.data.options;
    if (opts?.length === 1) {
      const [op] = opts;

      if (op.type === ApplicationCommandOptionType.SubcommandGroup) {
        const [subCmd] = op.options;
        return subCmd.options || [];
      }

      if (op.type === ApplicationCommandOptionType.Subcommand) {
        return op.options || [];
      }
    }
    return opts || [];
  }

  getOption<T extends APIApplicationCommandInteractionDataOption | undefined>(
    name: string
  ) {
    return this.getOptions().find(o => o.name === name) as T;
  }

  getFocusedOption() {
    assert(this.i.type === InteractionType.ApplicationCommandAutocomplete);

    //const opt = this.i.data.options.find(o => 'focused' in o && o.focused)!;
    const opts = this.getOptions();
    return opts.find(o => 'focused' in o && o.focused);
  }
}

export abstract class Command {
  abstract meta: RESTPostAPIApplicationCommandsJSONBody;

  skip = false;

  abstract run(
    ctx: Context<APIApplicationCommandInteraction>
  ): Promise<unknown>;

  async autocomplete(
    _ctx: Context<APIApplicationCommandAutocompleteInteraction>
  ) {}
}

abstract class MessageComponentHandler<
  T extends APIMessageComponentInteraction,
> {
  abstract matches: string | RegExp;

  abstract run(ctx: Context<T>): Promise<unknown>;
}

export abstract class SelectMenu extends MessageComponentHandler<APIMessageComponentSelectMenuInteraction> {}

export abstract class Button extends MessageComponentHandler<APIMessageComponentButtonInteraction> {}
