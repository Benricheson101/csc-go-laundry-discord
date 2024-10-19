// TODO: figure out rate limiting

import type {
  APIDMChannel,
  APIInteraction,
  APIInteractionResponse,
  APIMessage,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
  RESTPutAPIApplicationCommandsJSONBody,
  RESTPutAPIApplicationCommandsResult,
} from 'discord-api-types/v10';

export class DiscordAPI {
  #botToken: string;

  constructor(token: string) {
    this.#botToken = token;
  }

  async sendMsg(
    channelID: string,
    msg: RESTPostAPIChannelMessageJSONBody
  ): Promise<APIMessage> {
    return fetch(`https://discord.com/api/v10/channels/${channelID}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${this.#botToken}`,
      },
      body: JSON.stringify(msg),
    }).then(r => r.json() as Promise<APIMessage>);
  }

  async updateMsg(
    channelID: string,
    messageID: string,
    msg: RESTPatchAPIChannelMessageJSONBody
  ) {
    return fetch(
      `https://discord.com/api/v10/channels/${channelID}/messages/${messageID}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
        },
        body: JSON.stringify(msg),
      }
    ).then(r => r.json() as Promise<APIMessage>);
  }

  async createDM(userID: string) {
    return fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
      },
      body: JSON.stringify({recipient_id: userID}),
    }).then(r => r.json() as Promise<APIDMChannel>);
  }

  async createCommands(
    cmds: RESTPutAPIApplicationCommandsJSONBody
  ): Promise<RESTPutAPIApplicationCommandsResult> {
    const appID = Buffer.from(
      this.#botToken.split('.')[0],
      'base64'
    ).toString();
    return fetch(`https://discord.com/api/v10/applications/${appID}/commands`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
      },
      body: JSON.stringify(cmds),
    }).then(r => r.json() as Promise<RESTPutAPIApplicationCommandsResult>);
  }

  async respondInteraction(i: APIInteraction, msg: APIInteractionResponse) {
    return fetch(
      `https://discord.com/api/v10/interactions/${i.id}/${i.token}`,
      {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(msg),
      }
    );
  }

  async editOriginal(
    i: APIInteraction,
    msg: RESTPatchAPIChannelMessageJSONBody
  ) {
    return fetch(
      `https://discord.com/api/v10/webhooks/${i.application_id}/${i.token}/messages/@original`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(msg),
      }
    );
  }
}
