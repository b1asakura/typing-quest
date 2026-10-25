// 難易度コース定義
// 新しいコース（だくおんコース・ようおんコース など）は COURSES に1つ足すだけで選択画面に出てくる。

/**
 * お題の出し方
 * - keys: プールからランダムにキーを length 個ならべる（labels でキーごとの表示を変えられる）
 * - words: ひらがなの言葉リストからランダムに1つ（ローマ字は自動で作る）
 */
export type PromptSource =
  | { kind: 'keys'; pool: string[]; length: number; labels?: Record<string, string> }
  | { kind: 'words'; words: string[] }

export interface OreConfig {
  source: PromptSource
  /** 制限時間（秒） */
  timeLimit: number
  /** 採掘成功時のボーナス */
  bonus: number
}

export interface CourseDef {
  id: string
  level: number
  /** コース名（ひらがな・カタカナのみ） */
  name: string
  /** 何を練習するか */
  description: string
  /** 選択画面とワールドのテーマ色 */
  theme: CourseTheme
  monster: { source: PromptSource; score: number }
  gold: OreConfig
  diamond: OreConfig
}

export interface CourseTheme {
  sky: number
  fog: number
  ground: number
  groundSide: number
  accent: string
  /** 背景の飾り */
  decor: 'trees' | 'flowers' | 'crystals' | 'lava'
}

const VOWEL_LABELS: Record<string, string> = { A: 'あ', I: 'い', U: 'う', E: 'え', O: 'お' }
const VOWELS = ['A', 'I', 'U', 'E', 'O']

export const COURSES: CourseDef[] = [
  {
    id: 'lv1-forest',
    level: 1,
    name: 'はじまりの もり',
    description: 'ホームポジション（F と J）を おぼえよう',
    theme: { sky: 0x8fd3ff, fog: 0xbfe6ff, ground: 0x6cc24a, groundSide: 0x8a5a2b, accent: '#6cc24a', decor: 'trees' },
    monster: { source: { kind: 'keys', pool: ['F', 'J'], length: 1 }, score: 10 },
    gold: { source: { kind: 'keys', pool: ['D', 'K', 'F', 'J'], length: 2 }, timeLimit: 8, bonus: 50 },
    diamond: { source: { kind: 'keys', pool: ['A', 'S', 'D', 'F', 'J', 'K', 'L'], length: 3 }, timeLimit: 10, bonus: 100 },
  },
  {
    id: 'lv2-meadow',
    level: 2,
    name: 'あいうえおの そうげん',
    description: 'ぼいん（あ・い・う・え・お）の ゆびを おぼえよう',
    theme: { sky: 0xa6e3ff, fog: 0xd8f4ff, ground: 0x8fd65a, groundSide: 0x9a6a35, accent: '#8fd65a', decor: 'flowers' },
    monster: { source: { kind: 'keys', pool: VOWELS, length: 1, labels: VOWEL_LABELS }, score: 10 },
    gold: { source: { kind: 'keys', pool: VOWELS, length: 3, labels: VOWEL_LABELS }, timeLimit: 8, bonus: 60 },
    diamond: { source: { kind: 'keys', pool: VOWELS, length: 5, labels: VOWEL_LABELS }, timeLimit: 10, bonus: 120 },
  },
  {
    id: 'lv3-cave',
    level: 3,
    name: 'ローマじの どうくつ',
    description: '2かい うって 1もじ（しいん＋ぼいん）',
    theme: { sky: 0x3a3550, fog: 0x4a4566, ground: 0x7a7a80, groundSide: 0x55555c, accent: '#b0a0ff', decor: 'crystals' },
    monster: {
      source: {
        kind: 'words',
        words: [
          'か', 'き', 'く', 'け', 'こ', 'さ', 'す', 'せ', 'そ', 'た', 'て', 'と',
          'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も',
        ],
      },
      score: 15,
    },
    gold: {
      source: { kind: 'words', words: ['ねこ', 'いぬ', 'さる', 'かめ', 'とり', 'あめ', 'そら', 'うみ', 'やま', 'はな', 'くも', 'かさ'] },
      timeLimit: 8,
      bonus: 80,
    },
    diamond: {
      source: { kind: 'words', words: ['さくら', 'めだか', 'きつね', 'たぬき', 'うさぎ', 'こあら', 'からす', 'すいか', 'たまご', 'くるま'] },
      timeLimit: 10,
      bonus: 150,
    },
  },
  {
    id: 'lv4-volcano',
    level: 4,
    name: 'たつじんの かざん',
    description: 'ことばを スラスラ うとう',
    theme: { sky: 0xff9a6a, fog: 0xffb48a, ground: 0x5a4a48, groundSide: 0x3a2a28, accent: '#ff6a3a', decor: 'lava' },
    monster: {
      source: { kind: 'words', words: ['いぬ', 'そら', 'うみ', 'やま', 'ほし', 'かぜ', 'つき', 'もり', 'かわ', 'いけ', 'さかな', 'からす'] },
      score: 20,
    },
    gold: {
      source: { kind: 'words', words: ['りんご', 'ばなな', 'いちご', 'とまと', 'みかん', 'めろん', 'すいか', 'にんじん', 'かぼちゃ', 'けーき', 'ぷーる'] },
      timeLimit: 6,
      bonus: 120,
    },
    diamond: {
      source: { kind: 'words', words: ['だいやもんど', 'かぶとむし', 'ひまわり', 'おにぎり', 'ゆきだるま', 'あさがお', 'くわがた', 'たんぽぽ', 'すーぱーまん'] },
      timeLimit: 10,
      bonus: 250,
    },
  },
]

/** 通常モンスターを何体倒したらレア鉱石が出るか */
export const ORE_SPAWN_EVERY = { min: 3, max: 4 }
/** レア鉱石のうちダイヤが出る確率 */
export const DIAMOND_CHANCE = 0.35
