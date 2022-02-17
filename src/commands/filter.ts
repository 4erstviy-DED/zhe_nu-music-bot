import { MessageEmbed } from 'discord.js';
import { ExecuteOptions, GuildCommand } from '../types/Command';
import { MessageSender } from '../utils/MessageSender';

const e = async ({ subscription, args }: ExecuteOptions) => {
  if (args![0] === 'nightcore' || args![0] === 'bassboost') subscription!.filter = args![0];
  else subscription!.filter = 'none';

  const embed = new MessageEmbed().setColor('BLUE').setDescription('???');
  new MessageSender({ channel: subscription!.channel, message: { embeds: [embed] } }).send();
};

module.exports = new GuildCommand({
  createSubscription: true,
  description: '',
  e,
  name: 'filter',
});
