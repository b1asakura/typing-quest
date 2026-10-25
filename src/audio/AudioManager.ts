// Hybrid Audio Manager
// 外部ファイルがあればそれを、なければ Web Audio API の合成音を鳴らす。
import { AUDIO_VOLUME, BGM_FILES, SOUND_FILES, type SoundName } from '../data/audioConfig.ts'

type Synth = (ctx: AudioContext, out: AudioNode, t: number) => void

export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfx: GainNode | null = null
  private bgmGain: GainNode | null = null
  private buffers = new Map<SoundName, AudioBuffer>()
  private noise: AudioBuffer | null = null
  private bgmStarted = false
  private loading: Promise<void> | null = null

  /** ブラウザの自動再生制限があるので、最初のキー入力・クリックで呼ぶ */
  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = AUDIO_VOLUME.master
      this.master.connect(ctx.destination)
      this.sfx = ctx.createGain()
      this.sfx.gain.value = AUDIO_VOLUME.sfx
      this.sfx.connect(this.master)
      this.bgmGain = ctx.createGain()
      this.bgmGain.gain.value = AUDIO_VOLUME.bgm
      this.bgmGain.connect(this.master)
      this.noise = createNoiseBuffer(ctx)
      this.loading = this.loadExternal()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(name: SoundName): void {
    const ctx = this.ctx
    if (!ctx || !this.sfx) return
    const buffer = this.buffers.get(name)
    if (buffer) {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(this.sfx)
      src.start()
      return
    }
    this.synths[name](ctx, this.sfx, ctx.currentTime + 0.005)
  }

  /** bgm.mp3 が置かれているときだけループ再生する */
  async startBgm(): Promise<void> {
    if (this.bgmStarted || !this.ctx || !this.bgmGain) return
    this.bgmStarted = true
    await this.loading
    const buffer = await this.fetchFirst(BGM_FILES)
    if (!buffer || !this.ctx) return
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(this.bgmGain)
    src.start()
  }

  private async loadExternal(): Promise<void> {
    const entries = Object.entries(SOUND_FILES) as [SoundName, string[]][]
    await Promise.all(
      entries.map(async ([name, paths]) => {
        const buffer = await this.fetchFirst(paths)
        if (buffer) this.buffers.set(name, buffer)
      }),
    )
  }

  private async fetchFirst(paths: string[]): Promise<AudioBuffer | null> {
    for (const path of paths) {
      try {
        const res = await fetch(import.meta.env.BASE_URL + path)
        // 開発サーバーは存在しないパスに index.html を返すので Content-Type も確かめる
        const type = res.headers.get('content-type') ?? ''
        if (!res.ok || !(type.startsWith('audio/') || type.startsWith('application/octet-stream'))) continue
        const data = await res.arrayBuffer()
        return await this.ctx!.decodeAudioData(data)
      } catch {
        // 見つからない・デコードできないときは合成音を使う
      }
    }
    return null
  }

  // ---- 合成音 ----

  private readonly synths: Record<SoundName, Synth> = {
    // 剣の攻撃音: シュッ（ノイズのスイープ）＋ ポコッ（低い音）
    hit: (ctx, out, t) => {
      this.noiseBurst(ctx, out, t, 0.12, 'bandpass', 3000, 900, 0.5)
      tone(ctx, out, t + 0.03, 'square', 320, 120, 0.12, 0.25)
      tone(ctx, out, t + 0.03, 'sine', 180, 60, 0.15, 0.5)
    },
    // ツルハシの採掘音: ガキン！（金属っぽい倍音 ＋ アタックのノイズ）
    mine: (ctx, out, t) => {
      this.noiseBurst(ctx, out, t, 0.04, 'highpass', 2500, 2500, 0.6)
      for (const [f, g] of [[820, 0.3], [1310, 0.2], [2150, 0.16], [3370, 0.1]] as const) {
        tone(ctx, out, t, 'triangle', f, f * 0.98, 0.35, g)
      }
      tone(ctx, out, t, 'square', 140, 90, 0.08, 0.2)
    },
    // ダイヤ破壊のキラキラ音: 高い音のアルペジオ ＋ きらめき
    diamond: (ctx, out, t) => {
      const notes = [1047, 1319, 1568, 2093, 2637, 3136]
      notes.forEach((f, i) => {
        tone(ctx, out, t + i * 0.06, 'sine', f, f, 0.5, 0.22)
        tone(ctx, out, t + i * 0.06 + 0.25, 'triangle', f * 2, f * 2, 0.3, 0.06)
      })
      for (let i = 0; i < 10; i++) {
        const f = 3000 + Math.random() * 3000
        tone(ctx, out, t + 0.3 + i * 0.05, 'sine', f, f, 0.12, 0.05)
      }
    },
    // ミス時の軽い弾かれ音: カン！（短くてやさしい）
    miss: (ctx, out, t) => {
      tone(ctx, out, t, 'triangle', 1250, 1100, 0.12, 0.14)
      tone(ctx, out, t, 'sine', 2500, 2300, 0.06, 0.05)
    },
    // チャリーン！
    oreAppear: (ctx, out, t) => {
      for (const [d, f] of [[0, 1568], [0.09, 2093], [0.18, 2637]] as const) {
        tone(ctx, out, t + d, 'sine', f, f, 0.6, 0.2)
        tone(ctx, out, t + d, 'triangle', f * 1.5, f * 1.5, 0.25, 0.05)
      }
    },
    // 採掘成功ファンファーレ
    success: (ctx, out, t) => {
      const melody = [523, 659, 784, 1047, 784, 1047]
      const lens = [0.1, 0.1, 0.1, 0.18, 0.1, 0.45]
      let time = t
      melody.forEach((f, i) => {
        tone(ctx, out, time, 'square', f, f, lens[i] + 0.05, 0.1)
        tone(ctx, out, time, 'triangle', f / 2, f / 2, lens[i] + 0.05, 0.15)
        time += lens[i]
      })
      this.noiseBurst(ctx, out, t, 0.4, 'lowpass', 600, 100, 0.4)
    },
    // 鉱石がモコモコ逃げる音（こわくない、ぽよぽよ下がる音）
    escape: (ctx, out, t) => {
      for (let i = 0; i < 4; i++) {
        tone(ctx, out, t + i * 0.14, 'sine', 500 - i * 70, 300 - i * 50, 0.12, 0.2)
      }
    },
    select: (ctx, out, t) => {
      tone(ctx, out, t, 'square', 660, 660, 0.06, 0.08)
      tone(ctx, out, t + 0.06, 'square', 990, 990, 0.1, 0.08)
    },
  }

  private noiseBurst(
    ctx: AudioContext,
    out: AudioNode,
    t: number,
    duration: number,
    type: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    gain: number,
  ): void {
    if (!this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(freqStart, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + duration)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    src.connect(filter).connect(g).connect(out)
    src.start(t)
    src.stop(t + duration + 0.02)
  }
}

function tone(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  gain: number,
): void {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freqStart, t)
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + duration)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}
