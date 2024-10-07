// TODO: figure out rate limiting

import type {
  APIDMChannel,
  APIMessage,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
  RESTPutAPIApplicationCommandsJSONBody,
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

  async createCommands(cmds: RESTPutAPIApplicationCommandsJSONBody) {
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
    });
  }
}
