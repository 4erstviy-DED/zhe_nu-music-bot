// TODO: Переделать класс команд, проблема с типами аргументов

import { GuildMember, Message } from 'discord.js';
import { client } from '../../index';
import { subscriptionPlayerListener } from '../events/player';
import { FilterName } from '../utils/AudioTransformer';
import { Subscription } from './Subscription';

export interface ExecuteOptions {
  args?: string[] | FilterName[];
  member?: GuildMember;
  message: Message;
  subscription?: Subscription;
}

export interface CommandOptions {
  aliases?: string[];
  argsRequired?: 'none' | 'optional' | 'required';
  args?: string[];
  description: string;
  e: (options: ExecuteOptions) => void | Promise<void>;
  name: string;
  noArgsMessage?: string;
}

export interface GuildCommandsOptions extends CommandOptions {
  memberRequired?: boolean;
  createSubscription?: boolean;
}

export abstract class Command {
  protected readonly _aliases: string[];
  protected readonly _argsRequired: 'none' | 'optional' | 'required';
  protected readonly _args: string[];
  protected readonly _description: string;
  protected readonly _e: (options: ExecuteOptions) => void | Promise<void>;
  protected readonly _name: string;
  protected readonly _noArgsMessage: string;

  protected abstract _onlyGuild: boolean;

  constructor(options: CommandOptions) {
    this._aliases = [options.name];
    if (options.aliases) this._aliases.push(...options.aliases);

    this._argsRequired = options.argsRequired || 'none';
    if (this._argsRequired === 'required' && !options.args)
      throw new Error('Args required, but args template not provided');

    this._args = options.args || [];
    this._description = options.description;
    this._e = options.e;
    this._noArgsMessage = options.noArgsMessage || 'Не указаны аргументы';
    this._name = options.name;
  }

  get aliases() {
    return this._aliases;
  }
  get args() {
    return this._args;
  }
  get description() {
    return this._description;
  }
  get name() {
    return this._name;
  }

  abstract execute(options: ExecuteOptions): void | Promise<void>;
}

export class GuildCommand extends Command {
  protected _onlyGuild: boolean;
  private _memberRequired: boolean;
  protected _createSubscription: boolean;

  constructor(options: GuildCommandsOptions) {
    super(options);
    this._onlyGuild = true;
    this._memberRequired = !!options.memberRequired;
    this._createSubscription = !!options.createSubscription;
  }

  async execute(options: ExecuteOptions) {
    if (this._argsRequired === 'required' && !options.args) options.message.channel.send(this._noArgsMessage);
    if (this._onlyGuild && !options.message.guild) throw new Error('Not provided guild');
    if (this._memberRequired && !options.member) throw new Error('Not provided member');
    if (this._createSubscription && !options.subscription) {
      const message = options.message;
      const guild = message.guild!;
      let subscription = client.subscriptions.get(guild.id);

      if (!subscription) {
        client.subscriptions.set(guild.id, new Subscription({ guild: guild, textChannel: message.channel }));
        subscription = client.subscriptions.get(message.guildId!);
        subscriptionPlayerListener(subscription!);
      }

      options.subscription = subscription;
    }

    await this._e(options);
  }
}
