// キーボード配列座標（JIS/USの文字キー部分。1ユニット = 1キー幅）
import type { FingerId } from './fingers.ts'

export interface KeyDef {
  /** 入力判定に使う大文字の文字（スペースは ' '） */
  code: string
  /** キートップの表示 */
  label: string
  /** 列方向の位置（キー幅単位、左端が0） */
  x: number
  /** 行（0 = 上段 QWERTY, 1 = ホーム, 2 = 下段, 3 = スペース） */
  row: number
  width: number
  finger: FingerId
}

interface RowDef {
  offset: number
  keys: [string, FingerId][]
}

const ROWS: RowDef[] = [
  {
    offset: 0,
    keys: [
      ['Q', 'L_PINKY'], ['W', 'L_RING'], ['E', 'L_MIDDLE'], ['R', 'L_INDEX'], ['T', 'L_INDEX'],
      ['Y', 'R_INDEX'], ['U', 'R_INDEX'], ['I', 'R_MIDDLE'], ['O', 'R_RING'], ['P', 'R_PINKY'], ['-', 'R_PINKY'],
    ],
  },
  {
    offset: 0.25,
    keys: [
      ['A', 'L_PINKY'], ['S', 'L_RING'], ['D', 'L_MIDDLE'], ['F', 'L_INDEX'], ['G', 'L_INDEX'],
      ['H', 'R_INDEX'], ['J', 'R_INDEX'], ['K', 'R_MIDDLE'], ['L', 'R_RING'], [';', 'R_PINKY'],
    ],
  },
  {
    offset: 0.75,
    keys: [
      ['Z', 'L_PINKY'], ['X', 'L_RING'], ['C', 'L_MIDDLE'], ['V', 'L_INDEX'], ['B', 'L_INDEX'],
      ['N', 'R_INDEX'], ['M', 'R_INDEX'], [',', 'R_MIDDLE'], ['.', 'R_RING'], ['/', 'R_PINKY'],
    ],
  },
]

function buildLayout(): KeyDef[] {
  const keys: KeyDef[] = []
  ROWS.forEach((row, rowIndex) => {
    row.keys.forEach(([code, finger], i) => {
      keys.push({ code, label: code, x: row.offset + i, row: rowIndex, width: 1, finger })
    })
  })
  keys.push({ code: ' ', label: 'スペース', x: 2.75, row: 3, width: 5, finger: 'THUMB' })
  return keys
}

export const KEY_LAYOUT: KeyDef[] = buildLayout()

export const KEY_MAP: Map<string, KeyDef> = new Map(KEY_LAYOUT.map((k) => [k.code, k]))

/** キーの中心座標（キー幅単位） */
export function keyCenter(key: KeyDef): { x: number; y: number } {
  return { x: key.x + key.width / 2, y: key.row }
}

/** 2つのキーが隣り合っているか（ミス時の「となりのキーだったね！」判定） */
export function areNeighbors(a: string, b: string): boolean {
  const ka = KEY_MAP.get(a)
  const kb = KEY_MAP.get(b)
  if (!ka || !kb || ka === kb) return false
  const ca = keyCenter(ka)
  const cb = keyCenter(kb)
  return Math.abs(ca.x - cb.x) <= 1.3 && Math.abs(ca.y - cb.y) <= 1
}

/** KeyboardEvent.key を判定用の文字に正規化 */
export function normalizeKey(key: string): string | null {
  if (key === ' ' || key === 'Spacebar') return ' '
  if (key.length !== 1) return null
  const upper = key.toUpperCase()
  return KEY_MAP.has(upper) ? upper : null
}
