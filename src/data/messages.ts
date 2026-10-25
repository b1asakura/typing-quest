// 画面に出す文言（小学校低学年向け：ひらがな・カタカナのみ）

export const MESSAGES = {
  title: 'ボクセル タイピング クエスト',
  subtitle: 'コースを えらんでね',
  selectHint: 'すうじキー（1〜4）でも えらべるよ',
  start: 'スタート！',
  back: 'コースを えらびなおす',
  score: 'スコア',
  defeated: 'たおした かず',
  oreAppear: 'チャリーン！ レアこうせきが でたよ！',
  goldName: 'きんこうせき',
  diamondName: 'ダイヤこうせき',
  mineHint: 'じかんが なくなる まえに ほりきろう！',
  mineSuccess: ['すごい！', 'だいせいこう！', 'やったね！'],
  mineFail: 'おしい！ つぎは ほれるかな？',
  missNeighbor: 'となりの キーだったね！',
  missOther: 'みどりに ひかる キーを おしてね',
  fingerHint: (finger: string) => `${finger}で おしてね`,
  pressToStart: 'キーを おして はじめよう',
} as const
