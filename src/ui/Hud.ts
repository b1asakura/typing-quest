// DOM の UI（コース選択・スコア・お題ラベル・ゆびガイド・バナー）
import type { CourseDef } from '../data/courses.ts'
import { FINGERS } from '../data/fingers.ts'
import { KEY_MAP } from '../data/keyboard.ts'
import { MESSAGES } from '../data/messages.ts'
import type { Prompt } from '../game/prompts.ts'
import type { TypingSession } from '../game/typing.ts'
import { BATTLE_RATIO } from '../voxel/Stage.ts'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text !== undefined) e.textContent = text
  return e
}

function keyName(key: string): string {
  return key === ' ' ? 'スペース' : key
}

export class Hud {
  readonly root = el('div', 'hud-root')
  private select = el('div', 'select-screen')
  private top = el('div', 'hud-top')
  private scoreValue = el('span', 'score-value', '0')
  private defeatedValue = el('span', 'defeated-value', '0')
  private courseName = el('span', 'course-name')
  private label = el('div', 'target-label')
  private labelKana = el('div', 'label-kana')
  private labelRomaji = el('div', 'label-romaji')
  private timer = el('div', 'label-timer')
  private timerFill = el('div', 'label-timer-fill')
  private guide = el('div', 'finger-guide')
  private banner = el('div', 'banner')
  private ime = el('div', 'ime-warning', 'にゅうりょくモードを「えいすう」に してね')
  /** いま表示しているガイド（同じなら DOM を作りなおさない） */
  private guideState = ''
  private bannerTimer = 0
  private imeTimer = 0
  private shownScore = 0
  private targetScore = 0

  onSelectCourse: ((course: CourseDef) => void) | null = null
  onBack: (() => void) | null = null

  constructor(container: HTMLElement, courses: CourseDef[]) {
    container.appendChild(this.root)
    this.buildSelect(courses)
    this.buildTop()

    this.timer.appendChild(this.timerFill)
    this.label.append(this.labelKana, this.labelRomaji, this.timer)
    this.label.hidden = true
    this.guide.style.bottom = `${(1 - BATTLE_RATIO) * 100}%`
    this.guide.hidden = true
    this.ime.hidden = true
    this.root.append(this.label, this.guide, this.banner, this.ime)
  }

  showSelect(): void {
    this.select.hidden = false
    this.top.hidden = true
    this.hideLabel()
    this.guide.hidden = true
    this.guideState = ''
    this.banner.classList.remove('show')
  }

  startCourse(course: CourseDef): void {
    this.select.hidden = true
    this.top.hidden = false
    this.courseName.textContent = `Lv.${course.level} ${course.name}`
    this.root.style.setProperty('--accent', course.theme.accent)
    this.shownScore = 0
    this.targetScore = 0
    this.scoreValue.textContent = '0'
    this.defeatedValue.textContent = '0'
  }

  setScore(score: number, defeated: number): void {
    this.targetScore = score
    this.defeatedValue.textContent = String(defeated)
  }

  /** パーティクルがスコアに吸い込まれたとき */
  pulseScore(): void {
    this.scoreValue.classList.remove('pulse')
    void this.scoreValue.offsetWidth
    this.scoreValue.classList.add('pulse')
  }

  /** お題ラベルの中身を描きなおす */
  renderPrompt(prompt: Prompt, session: TypingSession, withTimer: boolean): void {
    const typed = session.typedRomaji()
    const rest = session.remainingRomaji()
    const full = typed + rest
    const sameAsRomaji = prompt.display === full || prompt.display === prompt.segments.map((s) => s.options[0]).join('')

    this.labelKana.replaceChildren()
    if (!sameAsRomaji) {
      // 打ち終わったかなは うすくする
      const doneSegments = session.completedSegments
      prompt.segments.forEach((seg, i) => {
        this.labelKana.appendChild(el('span', i < doneSegments ? 'done' : '', seg.label))
      })
    }
    this.labelKana.hidden = sameAsRomaji

    this.labelRomaji.replaceChildren()
    this.labelRomaji.classList.toggle('big', sameAsRomaji)
    if (typed) this.labelRomaji.appendChild(el('span', 'done', typed))
    if (rest) {
      const next = rest[0]
      const finger = KEY_MAP.get(next)?.finger
      const nextEl = el('span', 'next', keyName(next))
      if (finger) nextEl.style.setProperty('--finger', FINGERS[finger].cssColor)
      this.labelRomaji.appendChild(nextEl)
      if (rest.length > 1) this.labelRomaji.appendChild(el('span', 'rest', rest.slice(1)))
    }
    this.timer.hidden = !withTimer
    this.label.hidden = false
  }

  setTimer(ratio: number): void {
    const r = Math.max(0, Math.min(1, ratio))
    this.timerFill.style.width = `${r * 100}%`
    this.timerFill.style.background = r > 0.5 ? '#5ee05e' : r > 0.25 ? '#ffd23f' : '#ff9a3a'
    this.timer.classList.toggle('hurry', r < 0.35)
  }

  placeLabel(x: number, y: number, visible: boolean): void {
    this.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    this.label.style.visibility = visible ? 'visible' : 'hidden'
  }

  hideLabel(): void {
    this.label.hidden = true
  }

  /** 次に押すキーと ゆびの案内 */
  showFingerGuide(key: string | null): void {
    const def = key ? KEY_MAP.get(key) : undefined
    const guideState = `hint:${def?.code ?? ''}`
    if (guideState === this.guideState) return
    this.guideState = guideState
    if (!def) {
      this.guide.hidden = true
      return
    }
    const finger = FINGERS[def.finger]
    this.guide.className = 'finger-guide'
    this.guide.replaceChildren(
      el('span', 'guide-key', keyName(def.code)),
      el('span', 'guide-text', MESSAGES.fingerHint(finger.label)),
    )
    this.guide.style.setProperty('--finger', finger.cssColor)
    this.guide.hidden = false
  }

  /** ミス: 押したキーと正解キーを並べて見せる */
  showMiss(wrong: string, correct: string, neighbor: boolean): void {
    const def = KEY_MAP.get(correct)
    if (!def) return
    const finger = FINGERS[def.finger]
    this.guideState = `miss:${wrong}:${correct}`
    this.guide.className = 'finger-guide miss'
    const compare = el('span', 'guide-compare')
    compare.append(el('span', 'guide-key wrong', keyName(wrong)), el('span', 'guide-arrow', '→'), el('span', 'guide-key correct', keyName(correct)))
    this.guide.replaceChildren(
      el('span', 'guide-text', neighbor ? MESSAGES.missNeighbor : MESSAGES.missOther),
      compare,
      el('span', 'guide-text small', MESSAGES.fingerHint(finger.label)),
    )
    this.guide.style.setProperty('--finger', finger.cssColor)
    this.guide.hidden = false
  }

  showBanner(text: string, kind: 'info' | 'success' | 'gentle', duration = 2): void {
    this.banner.textContent = text
    this.banner.className = `banner show ${kind}`
    this.bannerTimer = duration
  }

  showImeWarning(): void {
    this.ime.hidden = false
    this.imeTimer = 3
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt
      if (this.bannerTimer <= 0) this.banner.classList.remove('show')
    }
    if (this.imeTimer > 0) {
      this.imeTimer -= dt
      if (this.imeTimer <= 0) this.ime.hidden = true
    }
    if (this.shownScore !== this.targetScore) {
      const diff = this.targetScore - this.shownScore
      this.shownScore += Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * dt * 4))
      if (Math.sign(this.targetScore - this.shownScore) !== Math.sign(diff)) this.shownScore = this.targetScore
      this.scoreValue.textContent = String(this.shownScore)
    }
  }

  private buildSelect(courses: CourseDef[]): void {
    const title = el('h1', 'title', MESSAGES.title)
    const subtitle = el('p', 'subtitle', MESSAGES.subtitle)
    const list = el('div', 'course-list')
    courses.forEach((course, i) => {
      const card = el('button', 'course-card')
      card.type = 'button'
      card.style.setProperty('--accent', course.theme.accent)
      card.append(
        el('span', 'course-level', `Lv.${course.level}`),
        el('span', 'course-title', course.name),
        el('span', 'course-desc', course.description),
        el('span', 'course-key', `${i + 1}`),
      )
      card.addEventListener('click', () => this.onSelectCourse?.(course))
      list.appendChild(card)
    })
    this.select.append(title, subtitle, list, el('p', 'select-hint', MESSAGES.selectHint))
    this.root.appendChild(this.select)
  }

  private buildTop(): void {
    const score = el('div', 'hud-box')
    score.append(el('span', 'hud-caption', MESSAGES.score), this.scoreValue)
    const defeated = el('div', 'hud-box')
    defeated.append(el('span', 'hud-caption', MESSAGES.defeated), this.defeatedValue)
    const back = el('button', 'back-button', MESSAGES.back)
    back.type = 'button'
    back.addEventListener('click', () => this.onBack?.())
    const right = el('div', 'hud-right')
    right.append(this.courseName, back)
    this.top.append(score, defeated, right)
    this.top.hidden = true
    this.root.appendChild(this.top)
  }
}
