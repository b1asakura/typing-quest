// Voxel Typing Quest - ゲームループ
import './style.css'
import * as THREE from 'three'
import { AudioManager } from './audio/AudioManager.ts'
import { COURSES, DIAMOND_CHANCE, ORE_SPAWN_EVERY, type CourseDef, type OreConfig } from './data/courses.ts'
import { areNeighbors, normalizeKey } from './data/keyboard.ts'
import { MESSAGES } from './data/messages.ts'
import { createPrompt, type Prompt } from './game/prompts.ts'
import { TypingSession } from './game/typing.ts'
import { Hud } from './ui/Hud.ts'
import { Monster, Ore } from './voxel/entities.ts'
import { MONSTER_KINDS, ORE_COLORS, type OreKind } from './voxel/models.ts'
import { Stage } from './voxel/Stage.ts'

type Phase =
  | 'select'
  | 'monster' // 通常モンスター（時間制限なし）
  | 'monsterDefeated'
  | 'oreIncoming' // 鉱石が降ってくる
  | 'mining' // カウントダウン採掘
  | 'oreResult'

const app = document.querySelector<HTMLDivElement>('#app')!
const stage = new Stage(app)
const hud = new Hud(app, COURSES)
const audio = new AudioManager()

const state = {
  phase: 'select' as Phase,
  course: COURSES[0] as CourseDef,
  score: 0,
  defeated: 0,
  untilOre: 3,
  phaseTimer: 0,
  monster: null as Monster | null,
  ore: null as Ore | null,
  oreConfig: null as OreConfig | null,
  oreTimeLeft: 0,
  prompt: null as Prompt | null,
  session: null as TypingSession | null,
  lastDisplay: undefined as string | undefined,
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

// ---------------- 進行 ----------------

function showSelect(): void {
  removeTargets()
  stage.particles.clear()
  state.phase = 'select'
  state.session = null
  stage.keyboard.setTarget(null)
  stage.keyboard.clearMiss()
  hud.showSelect()
}

function startCourse(course: CourseDef): void {
  audio.unlock()
  void audio.startBgm()
  audio.play('select')
  removeTargets()
  stage.particles.clear()
  state.course = course
  state.score = 0
  state.defeated = 0
  state.untilOre = randInt(ORE_SPAWN_EVERY.min, ORE_SPAWN_EVERY.max)
  state.lastDisplay = undefined
  stage.setTheme(course.theme)
  hud.startCourse(course)
  spawnMonster()
}

function spawnMonster(): void {
  const kind = MONSTER_KINDS[Math.floor(Math.random() * MONSTER_KINDS.length)]
  const monster = new Monster(kind)
  stage.scene.add(monster.group)
  state.monster = monster
  stage.useTool('sword')
  setPrompt(createPrompt(state.course.monster.source, Math.random, state.lastDisplay))
  state.phase = 'monster'
}

function startOre(): void {
  const kind: OreKind = Math.random() < DIAMOND_CHANCE ? 'diamond' : 'gold'
  const ore = new Ore(kind)
  stage.scene.add(ore.group)
  state.ore = ore
  state.oreConfig = kind === 'diamond' ? state.course.diamond : state.course.gold
  state.session = null
  state.phase = 'oreIncoming'
  state.phaseTimer = 0
  stage.useTool('pickaxe')
  audio.play('oreAppear')
  hud.hideLabel()
  hud.showBanner(MESSAGES.oreAppear, 'info', 2.2)
  refreshGuide()
}

function beginMining(): void {
  const config = state.oreConfig!
  state.oreTimeLeft = config.timeLimit
  setPrompt(createPrompt(config.source))
  state.phase = 'mining'
  hud.showBanner(MESSAGES.mineHint, 'info', 1.6)
}

function setPrompt(prompt: Prompt): void {
  state.prompt = prompt
  state.lastDisplay = prompt.display
  state.session = new TypingSession(prompt.segments)
  stage.keyboard.clearMiss()
  renderPrompt()
  refreshGuide()
}

function renderPrompt(): void {
  if (state.prompt && state.session) hud.renderPrompt(state.prompt, state.session, state.phase === 'mining')
}

function refreshGuide(): void {
  const key = state.session && !state.session.isComplete ? state.session.nextKey() : null
  stage.keyboard.setTarget(key)
  if (!stage.keyboard.isShowingMiss) hud.showFingerGuide(key)
}

function removeTargets(): void {
  if (state.monster) stage.scene.remove(state.monster.group)
  if (state.ore) stage.scene.remove(state.ore.group)
  state.monster?.mesh.dispose()
  state.ore?.mesh.dispose()
  state.monster = null
  state.ore = null
}

// ---------------- 入力 ----------------

function onType(key: string): void {
  const session = state.session
  if (!session) return
  if (state.phase !== 'monster' && state.phase !== 'mining') return
  const expected = session.nextKey()
  const result = session.input(key)

  if (result === 'wrong') {
    // ペナルティなし。カン！と弾かれて、キーボードで位置をくらべて見せる
    audio.play('miss')
    if (expected) {
      stage.keyboard.showMiss(key)
      hud.showMiss(key, expected, areNeighbors(key, expected))
    }
    state.monster?.block()
    return
  }

  stage.keyboard.clearMiss()
  stage.swingTool()
  if (state.phase === 'monster') onMonsterHit(result === 'complete')
  else onOreHit(result === 'complete')
  if (state.session) renderPrompt()
  refreshGuide()
}

function onMonsterHit(defeated: boolean): void {
  const monster = state.monster!
  if (!defeated) {
    audio.play('select')
    stage.particles.burst(monster.center(), [0xffffff, 0xd8ffff], { count: 6, speed: 2, upward: 3, size: 0.08, life: 0.6 })
    return
  }
  audio.play('hit')
  stage.showSlash(monster.center().add(new THREE.Vector3(0, 0, 0.8)))
  stage.addShake(0.4)
  stage.particles.shatter(monster.mesh.worldVoxels(), monster.center(), { count: 70, speed: 5, size: 0.16, attract: true })
  stage.scene.remove(monster.group)
  monster.mesh.dispose()
  state.monster = null
  state.session = null
  hud.hideLabel()
  state.score += state.course.monster.score
  state.defeated++
  state.untilOre--
  hud.setScore(state.score, state.defeated)
  state.phase = 'monsterDefeated'
  state.phaseTimer = 0.8
}

function onOreHit(complete: boolean): void {
  const ore = state.ore!
  const session = state.session!
  const colors = ORE_COLORS[ore.kind]
  audio.play('mine')
  ore.crack(session.progress / Math.max(1, session.totalKeys))
  stage.particles.burst(ore.center().add(new THREE.Vector3(0, 0, 0.9)), [colors.gem, colors.light, 0x8c8c8c], {
    count: 10, speed: 3, upward: 5, size: 0.1, life: 1, glow: true,
  })
  stage.addShake(0.15)
  if (!complete) return

  // 採掘成功！
  audio.play(ore.kind === 'diamond' ? 'diamond' : 'success')
  if (ore.kind === 'diamond') audio.play('success')
  const center = ore.center()
  stage.particles.shatter(ore.mesh.worldVoxels(), center, { count: 120, speed: 8, size: 0.2, attract: true })
  stage.particles.burst(center, [colors.gem, colors.light], { count: 90, speed: 7, upward: 9, size: 0.22, attract: true, glow: true })
  stage.addShake(0.8)
  stage.scene.remove(ore.group)
  ore.mesh.dispose()
  state.ore = null
  state.session = null
  hud.hideLabel()
  state.score += state.oreConfig!.bonus
  hud.setScore(state.score, state.defeated)
  hud.showBanner(MESSAGES.mineSuccess[Math.floor(Math.random() * MESSAGES.mineSuccess.length)], 'success', 2)
  finishOre()
}

function onOreTimeout(): void {
  const ore = state.ore!
  // こわくない演出: モコモコ地面にもぐって逃げる
  ore.escape()
  audio.play('escape')
  stage.particles.burst(ore.center().setY(0.2), [0x8a5a2b, 0x6a4a22, 0x9a6a35], { count: 30, speed: 3, upward: 4, size: 0.14, life: 1.4 })
  state.session = null
  hud.hideLabel()
  hud.showBanner(MESSAGES.mineFail, 'gentle', 2.4)
  finishOre()
}

function finishOre(): void {
  state.phase = 'oreResult'
  state.phaseTimer = 2.4
  state.untilOre = randInt(ORE_SPAWN_EVERY.min, ORE_SPAWN_EVERY.max)
  stage.keyboard.clearMiss()
  refreshGuide()
}

window.addEventListener('keydown', (e) => {
  if (e.isComposing || e.key === 'Process') {
    hud.showImeWarning()
    return
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === ' ') e.preventDefault()
  if (e.repeat) return
  audio.unlock()

  if (state.phase === 'select') {
    const n = Number(e.key)
    if (n >= 1 && n <= COURSES.length) startCourse(COURSES[n - 1])
    return
  }
  if (e.key === 'Escape') {
    showSelect()
    return
  }
  const key = normalizeKey(e.key)
  if (key) onType(key)
})

window.addEventListener('pointerdown', () => audio.unlock())

hud.onSelectCourse = startCourse
hud.onBack = showSelect
stage.particles.onAbsorb = (() => {
  let last = 0
  return () => {
    const now = performance.now()
    if (now - last > 80) {
      last = now
      hud.pulseScore()
    }
  }
})()

// ---------------- ループ ----------------

const timer = new THREE.Timer()
timer.connect(document)

function tick(timestamp: number): void {
  timer.update(timestamp)
  const dt = Math.min(timer.getDelta(), 0.1)

  state.monster?.update(dt)
  state.ore?.update(dt)

  switch (state.phase) {
    case 'monsterDefeated':
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0) {
        if (state.untilOre <= 0) startOre()
        else spawnMonster()
      }
      break
    case 'oreIncoming':
      if (state.ore?.state === 'ready') {
        state.phaseTimer += dt
        if (state.phaseTimer > 0.5) beginMining()
      }
      break
    case 'mining': {
      const config = state.oreConfig!
      state.oreTimeLeft -= dt
      const ratio = state.oreTimeLeft / config.timeLimit
      state.ore?.setTimeLeft(ratio)
      hud.setTimer(ratio)
      if (state.oreTimeLeft <= 0) onOreTimeout()
      break
    }
    case 'oreResult':
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0 && (!state.ore || state.ore.state === 'gone')) {
        removeTargets()
        spawnMonster()
      }
      break
  }

  // お題ラベルを頭の上に
  const anchor = state.monster?.labelAnchor() ?? (state.phase === 'mining' ? state.ore?.labelAnchor() : undefined)
  if (anchor && state.session) {
    const p = stage.toScreen(anchor)
    hud.placeLabel(p.x, p.y, p.visible)
  }

  // ミス表示が終わったら、ふつうの ゆびガイドに戻す
  if (!stage.keyboard.isShowingMiss && state.phase !== 'select') hud.showFingerGuide(state.session?.nextKey() ?? null)

  stage.update(dt)
  hud.update(dt)
  stage.render()
  requestAnimationFrame(tick)
}

showSelect()
requestAnimationFrame(tick)
