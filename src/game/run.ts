// 1かいの プレイの スコア・コンボ・のこり時間
import type { GameRules } from '../data/gameRules.ts'

export interface SuccessResult {
  /** 今回ふえた点（もとの点 + コンボボーナス） */
  gained: number
  comboBonus: number
  /** のびた秒数（のびなければ 0） */
  timeBonus: number
}

export class RunStats {
  score = 0
  combo = 0
  maxCombo = 0
  timeLeft: number
  private readonly rules: GameRules

  constructor(rules: GameRules) {
    this.rules = rules
    this.timeLeft = rules.totalTime
  }

  get isTimeUp(): boolean {
    return this.timeLeft <= 0
  }

  /** モンスターを倒した・鉱石を掘りきった */
  success(basePoints: number): SuccessResult {
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    const comboBonus = Math.min(this.combo - 1, this.rules.comboScoreCap) * this.rules.comboScoreStep
    const gained = basePoints + comboBonus
    this.score += gained
    const timeBonus = this.combo % this.rules.comboForTimeBonus === 0 ? this.rules.timeBonus : 0
    this.timeLeft += timeBonus
    return { gained, comboBonus, timeBonus }
  }

  /** ミスタイプ・鉱石に逃げられた: 減点はせず、コンボだけ 0 にもどす */
  breakCombo(): void {
    this.combo = 0
  }

  /** 時間を進める。時間切れになったら true */
  tick(dt: number): boolean {
    this.timeLeft = Math.max(0, this.timeLeft - Math.max(0, dt))
    return this.isTimeUp
  }
}
