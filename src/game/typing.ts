// かな → 入力セグメント変換と、1打ずつの正誤判定
import { KANA_ROMAJI, N_KANA, SOKUON_KANA, SOKUON_STANDALONE } from '../data/romajiTable.ts'

export interface Segment {
  /** 表示用のかな（keys お題ではキーのラベル） */
  label: string
  /** 正解になるローマ字の候補（先頭が表示用のおてほん） */
  options: string[]
}

const VOWEL_OR_NY = /^[AIUEONY]/

export function tokenizeKana(kana: string): Segment[] {
  const chars = [...kana]
  const raw: Segment[] = []
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i] + (chars[i + 1] ?? '')
    if (KANA_ROMAJI[pair]) {
      raw.push({ label: pair, options: KANA_ROMAJI[pair] })
      i++
    } else if (chars[i] === N_KANA || chars[i] === SOKUON_KANA) {
      raw.push({ label: chars[i], options: [] })
    } else if (KANA_ROMAJI[chars[i]]) {
      raw.push({ label: chars[i], options: KANA_ROMAJI[chars[i]] })
    } else {
      throw new Error(`ローマ字に変換できない文字: ${chars[i]} (${kana})`)
    }
  }

  // ん・っ は次の文字で打ち方が変わる
  const segments: Segment[] = []
  for (let i = 0; i < raw.length; i++) {
    const seg = raw[i]
    const next = raw[i + 1]
    if (seg.label === N_KANA) {
      const needsDouble = !next || next.options.length === 0 || next.options.some((o) => VOWEL_OR_NY.test(o))
      segments.push({ label: seg.label, options: needsDouble ? ['NN'] : ['N', 'NN'] })
    } else if (seg.label === SOKUON_KANA && next && next.options.length > 0) {
      // っ は次のかなと1つのセグメントにまとめる（例: っか → KKA / XTUKA）
      const doubled = next.options.filter((o) => !/^[AIUEON]/.test(o)).map((o) => o[0] + o)
      const standalone = SOKUON_STANDALONE.flatMap((s) => next.options.map((o) => s + o))
      segments.push({ label: seg.label + next.label, options: [...doubled, ...standalone] })
      i++
    } else if (seg.label === SOKUON_KANA) {
      segments.push({ label: seg.label, options: SOKUON_STANDALONE })
    } else {
      segments.push(seg)
    }
  }
  return segments
}

export type InputResult = 'correct' | 'wrong' | 'complete'

/**
 * 1つのお題を打ち切るまでの状態。
 * 候補が複数あるときは、それまでに打った文字と前方一致する候補を追いかける。
 */
export class TypingSession {
  readonly segments: Segment[]
  private index = 0
  private buffer = ''
  /** 確定済みセグメントで実際に打った文字列 */
  private typed: string[] = []
  private typedCount = 0

  constructor(segments: Segment[]) {
    this.segments = segments
  }

  get isComplete(): boolean {
    return this.index >= this.segments.length
  }

  /** 打ち終わったセグメント（かな）の数 */
  get completedSegments(): number {
    return this.index
  }

  /** 正しく打ったキーの数 */
  get progress(): number {
    return this.typedCount
  }

  /** おてほん通りに打った場合の総打鍵数 */
  get totalKeys(): number {
    return this.typed.join('').length + this.remainingRomaji().length
  }

  /** 次に押すべきキー（大文字） */
  nextKey(): string | null {
    if (this.isComplete) return null
    const option = this.currentOption()
    return option[this.buffer.length]
  }

  input(key: string): InputResult {
    if (this.isComplete) return 'complete'
    const seg = this.segments[this.index]
    const candidate = this.buffer + key

    if (seg.options.some((o) => o.startsWith(candidate))) {
      this.buffer = candidate
      this.typedCount++
      if (seg.options.includes(candidate)) {
        this.typed.push(candidate)
        this.buffer = ''
        this.index++
      }
      return this.isComplete ? 'complete' : 'correct'
    }

    // 「ん」を N 1回で確定したあとに、もう1回 N を押した場合などは前のセグメントの延長として受け付ける
    if (this.buffer === '' && this.index > 0) {
      const prev = this.segments[this.index - 1]
      const prevTyped = this.typed[this.index - 1]
      const extended = prevTyped + key
      if (prev.options.includes(extended)) {
        this.typed[this.index - 1] = extended
        this.typedCount++
        return 'correct'
      }
    }
    return 'wrong'
  }

  /** 打ち終わったローマ字 */
  typedRomaji(): string {
    return this.typed.join('') + this.buffer
  }

  /** これから打つローマ字（おてほん） */
  remainingRomaji(): string {
    if (this.isComplete) return ''
    let rest = this.currentOption().slice(this.buffer.length)
    for (let i = this.index + 1; i < this.segments.length; i++) rest += this.segments[i].options[0]
    return rest
  }

  private currentOption(): string {
    const seg = this.segments[this.index]
    return seg.options.find((o) => o.startsWith(this.buffer)) ?? seg.options[0]
  }
}
