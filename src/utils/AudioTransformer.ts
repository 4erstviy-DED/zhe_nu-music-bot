import { Readable } from 'stream';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import ytdl from 'ytdl-core';
import { validateYouTubeURL } from './Search';

export type FilterName = 'bassboost' | 'nightcore';
type Filters = Map<FilterName, Array<string>>;

const ffmpegOptions: string[] = ['-i', '-', '-f', 'mp3', '-y', '-ar', '44100', '-ac', '2'];
const filters: Filters = new Map([
  ['bassboost', ['-filter:a', 'bass=g=15']],
  ['nightcore', ['-filter:a', 'atempo=1.06,asetrate=44100*1.25']],
]);
const pipe = 'pipe:1';

export class AudioTransformer {
  private _ffmpeg: ChildProcessWithoutNullStreams | undefined;
  private _stream!: Readable;

  async fetchStream(link: string): Promise<Readable | undefined> {
    //Only YouTube stream available, update soon
    if (!validateYouTubeURL(link)) return;
    if (this._ffmpeg) this._stream.unpipe(this._ffmpeg.stdin);

    const info = await ytdl.getInfo(link);
    const format = ytdl.chooseFormat(info.formats, {
      quality: [91, 92, 93, 140],
      filter: (f) => f.container === 'mp4' || f.container === 'ts',
    });

    this._stream = ytdl(link, { format });

    return this._stream;
  }

  async filter(link: string, filter: FilterName): Promise<Readable | undefined> {
    if (!validateYouTubeURL(link)) return;
    if (this._ffmpeg) this._stream.unpipe(this._ffmpeg.stdin);
    if (!(await this.fetchStream(link))) return;

    const opt = [...ffmpegOptions, ...filters.get(filter)!, pipe];
    const ffmpeg = spawn('ffmpeg', opt);

    this._ffmpeg = ffmpeg;
    this._stream.pipe(this._ffmpeg.stdin);

    ffmpeg.stdout.on('close', () => {
      ffmpeg.stdout.removeAllListeners('close');
      this._stream.unpipe(ffmpeg.stdin);
    });

    return this._ffmpeg.stdout;
  }

  async seek(link: string, timestamp: number | string): Promise<Readable | undefined> {
    if (!validateYouTubeURL(link)) return;
    if (this._ffmpeg) this._stream.unpipe(this._ffmpeg.stdin);
    if (!(await this.fetchStream(link))) return;

    const opt = ['-ss', `${timestamp}`, ...ffmpegOptions, pipe];
    const ffmpeg = spawn('ffmpeg', opt);

    this._ffmpeg = ffmpeg;
    this._stream.pipe(this._ffmpeg.stdin);

    ffmpeg.stdout.on('close', () => {
      ffmpeg.stdout.removeAllListeners('close');
      this._stream.unpipe(ffmpeg.stdin);
    });

    return this._ffmpeg.stdout;
  }
}
