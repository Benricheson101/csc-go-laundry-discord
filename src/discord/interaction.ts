import type {ServerResponse} from 'node:http';
import {
  type APIApplicationCommandInteraction,
  type APIInteraction,
  type APIInteractionResponse,
  type APIInteractionResponseCallbackData,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type APIUser,
  InteractionResponseType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import type {Database} from '../db';
import type {CSCGo} from '../cscgo';
import type {DiscordAPI} from './api';

export class Context<T extends APIInteraction> {
  hasResponded = false;

  constructor(
    readonly i: T,
    readonly res: ServerResponse,
    readonly db: Database,
    readonly dapi: DiscordAPI,
    readonly cscgo: CSCGo
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

    fetch(
      `https://discord.com/api/v10/interactions/${this.i.id}/${this.i.token}`,
      {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(msg),
      }
    );
    this.hasResponded = true;
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
}

export abstract class Command {
  abstract meta: RESTPostAPIApplicationCommandsJSONBody;

  skip = false;

  abstract run(
    ctx: Context<APIApplicationCommandInteraction>
  ): Promise<unknown>;
}

export abstract class SelectMenu {
  abstract matches: string | RegExp;

  abstract run(
    ctx: Context<APIMessageComponentSelectMenuInteraction>
  ): Promise<unknown>;
}

export abstract class Button {
  abstract matches: string | RegExp;

  abstract run(
    ctx: Context<APIMessageComponentButtonInteraction>
  ): Promise<unknown>;
}
