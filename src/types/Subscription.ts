import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, Snowflake, TextBasedChannels } from 'discord.js';
import { Readable } from 'stream';
import { client } from '../../index';
import { AudioTransformer, FilterName } from '../utils/AudioTransformer';
import { Track, TrackQueue } from './TrackQueue';

interface SubscriptionListeners {
  connectionListener?: Function | null;
  playerListener?: Function | null;
}

interface SubscriptionOptions {
  guild: Guild;
  playerOptions?: {};
  listeners?: SubscriptionListeners;
  textChannel: TextBasedChannels;
}

export class Subscription {
  private _channel: TextBasedChannels;
  private _connection: VoiceConnection | undefined;
  private _guild: Guild;
  private _filter: FilterName | 'none';
  private _listeners: SubscriptionListeners;
  private _player: AudioPlayer;
  private _resource!: AudioResource;
  private _queue: TrackQueue;
  private _transformer!: AudioTransformer;

  constructor(options: SubscriptionOptions) {
    this._channel = options.textChannel;
    this._guild = options.guild;
    this._filter = 'none';
    this._listeners = options.listeners || { connectionListener: null, playerListener: null };
    this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this._queue = new TrackQueue();
    this._transformer = new AudioTransformer();
  }

  get channel() {
    return this._channel;
  }
  set channel(c: TextBasedChannels) {
    this._channel = c;
  }
  get connection() {
    return this._connection;
  }
  get filter() {
    return this._filter;
  }
  set filter(f) {
    this._filter = f;
  }
  get listeners() {
    return this._listeners;
  }
  get player() {
    return this._player;
  }
  get resource() {
    return this._resource;
  }
  get queue() {
    return this._queue;
  }

  addTrack(t: Track | Track[]) {
    this._queue.add(t);
  }

  async addAndPlayTrack(track: Track | Track[]) {
    try {
      this.addTrack(track);

      if (this._player.state.status === AudioPlayerStatus.Idle) this.playNext();
    } catch (e) {
      console.log(e);
    }
  }

  destroy() {
    this._player.stop();

    if (this._connection) this._connection.destroy();

    client.subscriptions.delete(this._guild.id);
  }

  async joinChannel(channelId: Snowflake) {
    try {
      if (this._connection && this._connection.state.status !== VoiceConnectionStatus.Destroyed) {
        if (
          this._connection.state.status === VoiceConnectionStatus.Ready &&
          this._connection?.joinConfig?.channelId === channelId
        )
          return;

        if (this._connection.state.status === VoiceConnectionStatus.Disconnected) {
          this._connection.rejoin({ channelId, selfDeaf: true, selfMute: false });
          this._connection.subscribe(this._player);
          return;
        }
      }

      this._connection = joinVoiceChannel({
        //@ts-ignore
        adapterCreator: this._guild.voiceAdapterCreator,
        channelId,
        guildId: this._guild.id,
      });
      this._connection.subscribe(this._player);

      await entersState(this._connection, VoiceConnectionStatus.Ready, 5_000);
    } catch (e) {
      console.log(e);
    }
  }

  private async play(track: Track) {
    try {
      let stream;

      if (this._filter === 'none') stream = await this._transformer.fetchStream(track.link);
      else stream = await this._transformer.filter(track.link, this._filter);
      if (!stream) return;

      this._resource = createAudioResource(stream);
      this._player.play(this._resource);
    } catch (e) {
      console.log(e);
    }
  }

  async playNext(position?: number) {
    try {
      let track: Track | null;

      if (position) track = this._queue.jump(position);
      else track = this._queue.next();

      if (!track) {
        this._player.stop();
        return;
      }

      this.play(track);
    } catch (e) {
      console.log(e);
    }
  }

  async playPrevious() {
    try {
      const track = this._queue.previous();

      if (!track) return;

      this.play(track);
    } catch (e) {
      console.log(e);
    }
  }

  async seek(ts: number) {
    //ts in miliseconds
    try {
      const stream = await this._transformer.seek(this._queue.current!.link, ts / 1000); // Условия

      if (!stream) return;

      this._resource = createAudioResource(stream);
      this._player.play(this._resource);
    } catch (e) {
      console.log(e);
    }
  }
}
