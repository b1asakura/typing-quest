// 指の色分け定義 (Finger Color Coding)

export type FingerId =
  | 'L_PINKY'
  | 'L_RING'
  | 'L_MIDDLE'
  | 'L_INDEX'
  | 'THUMB'
  | 'R_INDEX'
  | 'R_MIDDLE'
  | 'R_RING'
  | 'R_PINKY'

export interface FingerDef {
  id: FingerId
  hand: 'left' | 'right' | 'both'
  /** 子供向けの表示名（ひらがな） */
  label: string
  /** 色の名前（ひらがな） */
  colorName: string
  color: number
  cssColor: string
}

export const FINGERS: Record<FingerId, FingerDef> = {
  L_PINKY: { id: 'L_PINKY', hand: 'left', label: 'ひだりの こゆび', colorName: 'ピンク', color: 0xff8fc8, cssColor: '#ff8fc8' },
  L_RING: { id: 'L_RING', hand: 'left', label: 'ひだりの くすりゆび', colorName: 'オレンジ', color: 0xffa040, cssColor: '#ffa040' },
  L_MIDDLE: { id: 'L_MIDDLE', hand: 'left', label: 'ひだりの なかゆび', colorName: 'きいろ', color: 0xffe040, cssColor: '#ffe040' },
  L_INDEX: { id: 'L_INDEX', hand: 'left', label: 'ひだりの ひとさしゆび', colorName: 'みどり', color: 0x5ee05e, cssColor: '#5ee05e' },
  THUMB: { id: 'THUMB', hand: 'both', label: 'おやゆび', colorName: 'しろ', color: 0xf0f0f0, cssColor: '#f0f0f0' },
  R_INDEX: { id: 'R_INDEX', hand: 'right', label: 'みぎの ひとさしゆび', colorName: 'みずいろ', color: 0x5ed8ff, cssColor: '#5ed8ff' },
  R_MIDDLE: { id: 'R_MIDDLE', hand: 'right', label: 'みぎの なかゆび', colorName: 'あお', color: 0x4a7bff, cssColor: '#4a7bff' },
  R_RING: { id: 'R_RING', hand: 'right', label: 'みぎの くすりゆび', colorName: 'むらさき', color: 0xa966ff, cssColor: '#a966ff' },
  R_PINKY: { id: 'R_PINKY', hand: 'right', label: 'みぎの こゆび', colorName: 'マゼンタ', color: 0xff40d0, cssColor: '#ff40d0' },
}

/** ホームポジションでその指が置かれるキー */
export const HOME_KEYS: Record<FingerId, string> = {
  L_PINKY: 'A',
  L_RING: 'S',
  L_MIDDLE: 'D',
  L_INDEX: 'F',
  THUMB: ' ',
  R_INDEX: 'J',
  R_MIDDLE: 'K',
  R_RING: 'L',
  R_PINKY: ';',
}

/** ミス時に正解キーを示す色（緑） / 押し間違えたキーの色（赤） */
export const GUIDE_COLORS = {
  correct: 0x33ff66,
  wrong: 0xff4a4a,
  idleKey: 0xdedede,
  keyBase: 0x3a3a46,
}
