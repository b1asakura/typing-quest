// 上70%のバトル＆マイニング空間と、下30%のキーボードを1つの renderer で描く
import * as THREE from 'three'
import type { CourseTheme } from '../data/courses.ts'
import { Keyboard3D } from './Keyboard3D.ts'
import { createPickaxe, createSlash, createSword } from './models.ts'
import { ParticleSystem } from './ParticleSystem.ts'
import { World } from './World.ts'
import type { VoxelMesh } from './VoxelBuilder.ts'

/** 画面のうち 3D 空間が使う割合（残りがキーボード） */
export const BATTLE_RATIO = 0.7

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
  readonly world: World
  readonly particles: ParticleSystem
  readonly keyboard = new Keyboard3D()
  /** パーティクルが吸い込まれる先（カメラの少し前・下） */
  readonly absorbPoint = new THREE.Vector3(0, 1.4, 4.5)

  private sword: VoxelMesh
  private pickaxe: VoxelMesh
  private slash: VoxelMesh
  private swing = 0
  private slashTime = 0
  private shake = 0
  private hemi: THREE.HemisphereLight
  private sun: THREE.DirectionalLight
  private width = 1
  private height = 1
  private readonly baseCamera = new THREE.Vector3(0, 2.4, 6.5)

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.autoClear = false
    container.appendChild(this.renderer.domElement)

    this.camera.position.copy(this.baseCamera)
    this.camera.lookAt(0, 1.3, -3)
    this.scene.add(this.camera)

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556644, 1.6)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2)
    this.sun.position.set(6, 12, 6)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    const cam = this.sun.shadow.camera
    cam.left = -10
    cam.right = 10
    cam.top = 10
    cam.bottom = -10
    this.scene.add(this.sun)

    this.world = new World(this.scene)
    this.particles = new ParticleSystem()
    this.scene.add(this.particles.mesh)

    // 一人称の道具（カメラの子にして右下に持つ）
    this.sword = createSword()
    this.sword.position.set(0.75, -0.75, -1.6)
    this.sword.rotation.set(-0.3, 0, -0.5)
    this.sword.castShadow = false
    this.camera.add(this.sword)
    this.pickaxe = createPickaxe()
    this.pickaxe.position.copy(this.sword.position)
    this.pickaxe.rotation.copy(this.sword.rotation)
    this.pickaxe.visible = false
    this.pickaxe.castShadow = false
    this.camera.add(this.pickaxe)

    this.slash = createSlash()
    this.slash.visible = false
    this.scene.add(this.slash)

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  setTheme(theme: CourseTheme): void {
    this.world.build(theme)
    const dark = theme.decor === 'crystals'
    this.hemi.intensity = dark ? 1.1 : 1.6
    this.sun.intensity = dark ? 1.2 : 2.2
    this.sun.color.setHex(theme.decor === 'lava' ? 0xffc89a : 0xffffff)
  }

  useTool(tool: 'sword' | 'pickaxe'): void {
    this.sword.visible = tool === 'sword'
    this.pickaxe.visible = tool === 'pickaxe'
  }

  /** 剣をふる / ツルハシをふりおろす */
  swingTool(): void {
    this.swing = 1
  }

  /** 斬撃エフェクト */
  showSlash(at: THREE.Vector3): void {
    this.slash.position.copy(at)
    this.slash.rotation.set(0, 0, -0.6 + Math.random() * 1.2)
    this.slash.visible = true
    this.slashTime = 0.25
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount)
  }

  update(dt: number): void {
    this.world.update(dt)
    this.particles.update(dt, this.absorbPoint)
    this.keyboard.update(dt)

    // 道具のスイング
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 5)
    const s = Math.sin(this.swing * Math.PI)
    for (const tool of [this.sword, this.pickaxe]) {
      tool.rotation.x = -0.3 - s * 1.2
      tool.rotation.z = -0.5 + s * 0.6
      tool.position.x = 0.75 - s * 0.35
    }

    if (this.slashTime > 0) {
      this.slashTime -= dt
      const k = Math.max(0, this.slashTime / 0.25)
      ;(this.slash.material as THREE.MeshBasicMaterial).opacity = k
      this.slash.scale.setScalar(1 + (1 - k) * 0.5)
      if (this.slashTime <= 0) this.slash.visible = false
    }

    // 画面ゆれ（やさしめ）
    this.camera.position.copy(this.baseCamera)
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5)
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.3
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.3
    }
  }

  render(): void {
    const r = this.renderer
    const w = this.width
    const h = this.height
    const battleH = Math.round(h * BATTLE_RATIO)
    const keyH = h - battleH
    r.setScissorTest(true)

    // 上: バトル空間（WebGL は左下が原点）
    r.setViewport(0, keyH, w, battleH)
    r.setScissor(0, keyH, w, battleH)
    r.clear()
    r.render(this.scene, this.camera)

    // 下: キーボード
    r.setViewport(0, 0, w, keyH)
    r.setScissor(0, 0, w, keyH)
    r.clear()
    r.render(this.keyboard.scene, this.keyboard.camera)
    r.setScissorTest(false)
  }

  /** ワールド座標 → 画面（CSS ピクセル）座標 */
  toScreen(p: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = p.clone().project(this.camera)
    return {
      x: ((v.x + 1) / 2) * this.width,
      y: ((1 - v.y) / 2) * this.height * BATTLE_RATIO,
      visible: v.z < 1,
    }
  }

  private resize(): void {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / (this.height * BATTLE_RATIO)
    this.camera.updateProjectionMatrix()
    this.keyboard.resize(this.width / (this.height * (1 - BATTLE_RATIO)))
  }
}
