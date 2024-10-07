import {subtle} from 'node:crypto';
import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import {
  type APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
  type APIApplicationCommandInteraction,
  APIMessageComponentSelectMenuInteraction,
  ComponentType,
  APIMessageComponentButtonInteraction,
} from 'discord-api-types/v10';
import {verify} from 'discord-verify';

import type {CSCGo} from '../cscgo';
import type {Database} from '../db';
import type {DiscordAPI} from '../discord/api';
import {
  type Button,
  Context,
  type SelectMenu,
  type Command,
} from '../discord/interaction';
import {
  isMessageComponentButtonInteraction,
  isMessageComponentSelectMenuInteraction,
} from 'discord-api-types/utils/v10';

export class DiscordService {
  private server: Server;
  private cmds = new Map<string, Command>();
  private buttons = new Map<string | RegExp, Button>();
  private select = new Map<string | RegExp, SelectMenu>();

  constructor(
    private db: Database,
    private dapi: DiscordAPI,
    private cscgo: CSCGo
  ) {
    this.server = createServer();
    this.server.on('request', this.handleRequest.bind(this));
  }

  addCommands(cmds: Command[]) {
    for (const c of cmds) {
      if (c.skip) {
        continue;
      }

      this.cmds.set(c.meta.name, c);
    }
  }

  addButtons(btns: Button[]) {
    for (const b of btns) {
      this.buttons.set(b.matches, b);
    }
  }

  addSelectMenus(selects: SelectMenu[]) {
    for (const s of selects) {
      this.select.set(s.matches, s);
    }
  }

  async start() {
    this.server.listen(
      {host: '0.0.0.0', port: Number(process.env.PORT)},
      () => {
        console.log(`Server listening on http://0.0.0.0:${process.env.PORT}`);
      }
    );
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const json = (body: APIInteractionResponse) =>
      res
        .setHeader('Content-Type', 'application/json')
        .writeHead(200)
        .end(JSON.stringify(body));

    if (req.url !== '/i') {
      return res.writeHead(404).end();
    }

    if (req.method !== 'POST') {
      return res.writeHead(405).end();
    }

    const sig = req.headers['x-signature-ed25519'];
    const ts = req.headers['x-signature-timestamp'];
    const body = await Array.fromAsync(req).then(a => a.join(''));
    const isValid = await verify(
      body,
      sig as string,
      ts as string,
      process.env.DISCORD_PUBLIC_KEY!,
      subtle
    );

    if (!isValid) {
      return res.writeHead(401).end();
    }

    const i = JSON.parse(body) as APIInteraction;
    console.dir(i, {depth: null});

    switch (i.type) {
      case InteractionType.Ping: {
        return json({type: InteractionResponseType.Pong});
      }

      case InteractionType.ApplicationCommand: {
        await this.handleCmd(i, res);
        break;
      }

      case InteractionType.MessageComponent: {
        switch (true) {
          case isMessageComponentSelectMenuInteraction(i): {
            await this.handleSelect(i, res);
            break;
          }

          case isMessageComponentButtonInteraction(i): {
            await this.handleButton(i, res);
            break;
          }
        }
      }
    }

    if (!res.writableEnded) {
      return res.writeHead(200).end();
    }
  }

  async handleCmd(
    i: APIApplicationCommandInteraction,
    res: ServerResponse
  ): Promise<APIInteractionResponse | undefined> {
    const cmd = this.cmds.get(i.data.name);
    const ctx = new Context(i, res, this.db, this.dapi, this.cscgo);

    try {
      await cmd?.run(ctx);
    } catch (err) {
      console.error(`Error running command ${i.data.name}:`, err);
      return;
    }
  }

  async handleSelect(
    i: APIMessageComponentSelectMenuInteraction,
    res: ServerResponse
  ) {
    const menu = this.select
      .entries()
      .find(([e]) =>
        typeof e === 'string'
          ? i.data.custom_id.startsWith(e)
          : e.test(i.data.custom_id)
      );
    const ctx = new Context(i, res, this.db, this.dapi, this.cscgo);

    try {
      await menu?.[1].run(ctx);
    } catch (err) {
      console.error(`Error running select menu ${i.data.custom_id}:`, err);
      return;
    }
  }

  async handleButton(
    i: APIMessageComponentButtonInteraction,
    res: ServerResponse
  ) {
    const button = this.buttons
      .entries()
      .find(([e]) =>
        typeof e === 'string'
          ? i.data.custom_id.startsWith(e)
          : e.test(i.data.custom_id)
      );
    const ctx = new Context(i, res, this.db, this.dapi, this.cscgo);

    try {
      await button?.[1].run(ctx);
    } catch (err) {
      console.error(`Error running select menu ${i.data.custom_id}:`, err);
      return;
    }
  }

  async handleAutocomplete() {}

  async createDiscordCommands() {
    return this.dapi.createCommands([...this.cmds.values().map(c => c.meta)]);
  }
}
