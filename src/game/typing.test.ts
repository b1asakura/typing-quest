import { describe, expect, it } from 'vitest'
import { COURSES } from '../data/courses.ts'
import { KEY_MAP } from '../data/keyboard.ts'
import { createPrompt } from './prompts.ts'
import { tokenizeKana, TypingSession } from './typing.ts'

function typeAll(session: TypingSession, keys: string) {
  return [...keys].map((k) => session.input(k))
}

describe('tokenizeKana', () => {
  it('converts simple kana with kunrei-first display', () => {
    const s = new TypingSession(tokenizeKana('さくら'))
    expect(s.remainingRomaji()).toBe('SAKURA')
  })

  it('handles youon and sokuon', () => {
    expect(new TypingSession(tokenizeKana('かぼちゃ')).remainingRomaji()).toBe('KABOTYA')
    expect(tokenizeKana('きって').map((s) => s.label)).toEqual(['き', 'って'])
  })

  it('maps the long vowel mark to the hyphen key', () => {
    const s = new TypingSession(tokenizeKana('けーき'))
    expect(s.remainingRomaji()).toBe('KE-KI')
    expect(typeAll(s, 'KE-KI').at(-1)).toBe('complete')
  })

  it('requires NN before vowels and at the end', () => {
    const segs = tokenizeKana('みかん')
    expect(segs[2].options).toEqual(['NN'])
    expect(tokenizeKana('りんご')[1].options).toEqual(['N', 'NN'])
  })
})

describe('TypingSession', () => {
  it('accepts hepburn alternatives', () => {
    const s = new TypingSession(tokenizeKana('いちご'))
    expect(typeAll(s, 'ICHIGO').at(-1)).toBe('complete')
  })

  it('accepts single and double N before consonants', () => {
    const a = new TypingSession(tokenizeKana('りんご'))
    expect(typeAll(a, 'RINGO').at(-1)).toBe('complete')
    const b = new TypingSession(tokenizeKana('りんご'))
    expect(typeAll(b, 'RINNGO')).not.toContain('wrong')
    expect(b.isComplete).toBe(true)
  })

  it('reports wrong keys without advancing', () => {
    const s = new TypingSession(tokenizeKana('ねこ'))
    expect(s.input('J')).toBe('wrong')
    expect(s.nextKey()).toBe('N')
    expect(s.input('N')).toBe('correct')
    expect(s.nextKey()).toBe('E')
  })

  it('switches displayed romaji to the alternative being typed', () => {
    const s = new TypingSession(tokenizeKana('ほし'))
    typeAll(s, 'HOSH')
    expect(s.remainingRomaji()).toBe('I')
  })
})

describe('course data', () => {
  it('every prompt in every course is typeable on the keyboard', () => {
    for (const course of COURSES) {
      for (const source of [course.monster.source, course.gold.source, course.diamond.source]) {
        const items = source.kind === 'words' ? source.words : source.pool
        for (const item of items) {
          const segs = source.kind === 'words' ? tokenizeKana(item) : [{ label: item, options: [item] }]
          for (const seg of segs) for (const ch of seg.options[0]) expect(KEY_MAP.has(ch)).toBe(true)
        }
      }
    }
  })

  it('creates prompts with the configured length', () => {
    const course = COURSES[1]
    const prompt = createPrompt(course.diamond.source)
    expect(prompt.segments).toHaveLength(5)
  })
})
