import { describe, expect, it } from 'vitest'
import { GAME_RULES } from '../data/gameRules.ts'
import { RunStats } from './run.ts'

describe('RunStats', () => {
  it('adds a growing combo bonus for consecutive successes', () => {
    const run = new RunStats(GAME_RULES)
    expect(run.success(10).gained).toBe(10)
    expect(run.success(10).comboBonus).toBe(GAME_RULES.comboScoreStep)
    expect(run.combo).toBe(2)
  })

  it('caps the combo bonus', () => {
    const run = new RunStats(GAME_RULES)
    for (let i = 0; i < 30; i++) run.success(10)
    expect(run.success(10).comboBonus).toBe(GAME_RULES.comboScoreCap * GAME_RULES.comboScoreStep)
  })

  it('extends the time limit every N combo', () => {
    const run = new RunStats(GAME_RULES)
    const results = Array.from({ length: GAME_RULES.comboForTimeBonus }, () => run.success(10))
    expect(results.at(-1)!.timeBonus).toBe(GAME_RULES.timeBonus)
    expect(results.slice(0, -1).every((r) => r.timeBonus === 0)).toBe(true)
    expect(run.timeLeft).toBe(GAME_RULES.totalTime + GAME_RULES.timeBonus)
  })

  it('resets the combo but keeps score and max combo when broken', () => {
    const run = new RunStats(GAME_RULES)
    run.success(10)
    run.success(10)
    const score = run.score
    run.breakCombo()
    expect(run.combo).toBe(0)
    expect(run.maxCombo).toBe(2)
    expect(run.score).toBe(score)
    expect(run.success(10).comboBonus).toBe(0)
  })

  it('reports time up and never goes below zero', () => {
    const run = new RunStats(GAME_RULES)
    expect(run.tick(GAME_RULES.totalTime - 1)).toBe(false)
    expect(run.tick(5)).toBe(true)
    expect(run.timeLeft).toBe(0)
  })

  it('ignores negative frame deltas', () => {
    const run = new RunStats(GAME_RULES)
    run.tick(-2)
    expect(run.timeLeft).toBe(GAME_RULES.totalTime)
  })
})
