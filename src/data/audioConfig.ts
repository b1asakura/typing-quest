// 外部音源の差し替え設定
// public/audio/ に下のファイル名で置くと、合成音のかわりにそちらが鳴る。
// 別の場所のファイルを使うときは paths を書きかえる（先頭から順に探す）。

export type SoundName = 'hit' | 'mine' | 'diamond' | 'miss' | 'oreAppear' | 'success' | 'escape' | 'select'

export const SOUND_FILES: Record<SoundName, string[]> = {
  hit: ['audio/hit.wav', 'audio/hit.mp3'],
  mine: ['audio/mine.wav', 'audio/mine.mp3'],
  diamond: ['audio/diamond.wav', 'audio/diamond.mp3'],
  miss: ['audio/miss.wav', 'audio/miss.mp3'],
  oreAppear: ['audio/ore_appear.wav', 'audio/ore_appear.mp3'],
  success: ['audio/success.wav', 'audio/success.mp3'],
  escape: ['audio/escape.wav', 'audio/escape.mp3'],
  select: ['audio/select.wav', 'audio/select.mp3'],
}

export const BGM_FILES = ['audio/bgm.mp3', 'audio/bgm.ogg']

export const AUDIO_VOLUME = {
  master: 0.7,
  sfx: 0.9,
  bgm: 0.35,
}
