import { MessageEmbed } from 'discord.js';
import { ExecuteOptions, GuildCommand } from '../types/Command';
import { MessageSender } from '../utils/MessageSender';

const e = async ({ subscription, args }: ExecuteOptions) => {
  subscription!.seek(+args![0] * 1000);

  const embed = new MessageEmbed().setColor('BLUE').setDescription('???');
  new MessageSender({ channel: subscription!.channel, message: { embeds: [embed] } }).send();
};

module.exports = new GuildCommand({
  createSubscription: true,
  description: '',
  e,
  name: 'seek',
});
