// コースデータからお題を作る
import type { PromptSource } from '../data/courses.ts'
import { tokenizeKana, type Segment } from './typing.ts'

export interface Prompt {
  /** 大きく表示する文字（ひらがな または キー） */
  display: string
  segments: Segment[]
}

export type Rng = () => number

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)]
}

export function createPrompt(source: PromptSource, rng: Rng = Math.random, avoid?: string): Prompt {
  if (source.kind === 'keys') {
    const keys: string[] = []
    for (let i = 0; i < source.length; i++) {
      let key = pick(source.pool, rng)
      // 同じキーが3回続かないようにする
      if (source.pool.length > 1 && i >= 2 && keys[i - 1] === key && keys[i - 2] === key) {
        key = source.pool.find((k) => k !== key)!
      }
      keys.push(key)
    }
    const label = (k: string) => source.labels?.[k] ?? k
    // 1打のお題は前回と同じにならないようにする
    if (source.length === 1 && source.pool.length > 1 && avoid === label(keys[0])) {
      keys[0] = pick(source.pool.filter((k) => label(k) !== avoid), rng)
    }
    const segments = keys.map((k) => ({ label: label(k), options: [k] }))
    return { display: segments.map((s) => s.label).join(''), segments }
  }

  let word = pick(source.words, rng)
  if (avoid !== undefined && source.words.length > 1 && word === avoid) {
    word = pick(source.words.filter((w) => w !== avoid), rng)
  }
  return { display: word, segments: tokenizeKana(word) }
}
