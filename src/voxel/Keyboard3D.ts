// 画面下部の「光る3Dボクセルキーボード＆ボクセルハンド」
// 専用のシーンとカメラを持ち、メインの renderer で下30%のビューポートに描く。
import * as THREE from 'three'
import { FINGERS, GUIDE_COLORS, HOME_KEYS, type FingerId } from '../data/fingers.ts'
import { KEY_LAYOUT, KEY_MAP, keyCenter, type KeyDef } from '../data/keyboard.ts'
import { VoxelGrid, VoxelMesh } from './VoxelBuilder.ts'

const KEY_PITCH = 1.05
const KEY_HEIGHT = 0.35
const ROW_DEPTH = 1.05
const LAYOUT_CENTER_X = 5.5
const SKIN = 0xffd2a8

interface KeyView {
  def: KeyDef
  mesh: THREE.Mesh
  top: THREE.MeshLambertMaterial
  side: THREE.MeshLambertMaterial
  home: THREE.Vector3
}

interface FingerView {
  id: FingerId
  group: THREE.Group
  mesh: VoxelMesh
  material: THREE.MeshLambertMaterial
  home: THREE.Vector3
  target: THREE.Vector3
}

type KeyMode = 'idle' | 'target' | 'correct' | 'wrong'

export class Keyboard3D {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(32, 4, 0.1, 100)
  private keys = new Map<string, KeyView>()
  private fingers = new Map<FingerId, FingerView>()
  private palms: THREE.Group[] = []
  private targetKey: string | null = null
  private wrongKey: string | null = null
  private wrongTimer = 0
  private time = 0

  constructor() {
    this.scene.background = new THREE.Color(0x23233a)
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(2, 8, 5)
    this.scene.add(sun)

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(12.6, 0.4, 5.2),
      new THREE.MeshLambertMaterial({ color: 0x2f2f40 }),
    )
    base.position.set(0, -0.25, 0.1)
    this.scene.add(base)

    for (const def of KEY_LAYOUT) this.createKey(def)
    this.createHands()
  }

  /** ビューポートの縦横比に合わせて、キーボード全体と手が収まる位置にカメラを置く */
  resize(aspect: number): void {
    this.camera.aspect = aspect
    const halfWidth = 6.6
    const halfHeight = 2.7
    const vFov = THREE.MathUtils.degToRad(this.camera.fov)
    const distForHeight = halfHeight / Math.tan(vFov / 2)
    const distForWidth = halfWidth / (Math.tan(vFov / 2) * aspect)
    const dist = Math.max(distForHeight, distForWidth)
    const dir = new THREE.Vector3(0, 2, 1).normalize()
    this.camera.position.copy(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, 0, 0.5))
    this.camera.lookAt(0, 0, 0.5)
    this.camera.updateProjectionMatrix()
  }

  /** 次に押すキー（null で案内なし） */
  setTarget(key: string | null): void {
    this.targetKey = key
    const def = key ? KEY_MAP.get(key) : undefined
    for (const f of this.fingers.values()) f.target.copy(f.home)
    if (def) {
      const finger = this.fingers.get(def.finger)
      const view = this.keys.get(def.code)
      if (finger && view && def.finger !== 'THUMB') finger.target.set(view.home.x, finger.home.y, view.home.z + 0.1)
    }
  }

  /** ミスしたとき: 押したキーを赤く揺らし、正解キーを緑で強く光らせる */
  showMiss(wrong: string): void {
    this.wrongKey = wrong
    this.wrongTimer = 1.6
  }

  clearMiss(): void {
    this.wrongKey = null
    this.wrongTimer = 0
  }

  get isShowingMiss(): boolean {
    return this.wrongKey !== null
  }

  update(dt: number): void {
    this.time += dt
    if (this.wrongTimer > 0) {
      this.wrongTimer -= dt
      if (this.wrongTimer <= 0) this.wrongKey = null
    }
    const bounce = Math.abs(Math.sin(this.time * 6))
    const targetDef = this.targetKey ? KEY_MAP.get(this.targetKey) : undefined

    for (const view of this.keys.values()) {
      let mode: KeyMode = 'idle'
      if (view.def.code === this.wrongKey) mode = 'wrong'
      else if (view.def.code === this.targetKey) mode = this.wrongKey ? 'correct' : 'target'
      this.applyKeyMode(view, mode, bounce)
    }

    for (const f of this.fingers.values()) {
      f.group.position.lerp(f.target, Math.min(1, dt * 12))
      const active = targetDef?.finger === f.id
      const lift = active ? 0.25 + bounce * 0.45 : 0
      f.group.position.y = f.home.y + lift
      const def = FINGERS[f.id]
      f.material.emissive.setHex(active ? def.color : 0x000000)
      f.material.emissiveIntensity = active ? 0.5 + bounce * 0.5 : 0
    }
    // てのひらは ゆっくり息をするように
    this.palms.forEach((p, i) => (p.position.y = 0.55 + Math.sin(this.time * 2 + i) * 0.03))
  }

  private applyKeyMode(view: KeyView, mode: KeyMode, bounce: number): void {
    const finger = FINGERS[view.def.finger]
    view.mesh.position.copy(view.home)
    switch (mode) {
      case 'target':
        view.mesh.position.y += bounce * 0.18
        view.top.emissive.setHex(finger.color)
        view.top.emissiveIntensity = 0.55 + bounce * 0.45
        view.side.emissive.setHex(finger.color)
        view.side.emissiveIntensity = 0.6
        break
      case 'correct':
        view.mesh.position.y += 0.1 + bounce * 0.2
        view.top.emissive.setHex(GUIDE_COLORS.correct)
        view.top.emissiveIntensity = 1
        view.side.emissive.setHex(GUIDE_COLORS.correct)
        view.side.emissiveIntensity = 1
        break
      case 'wrong':
        view.mesh.position.x += Math.sin(this.time * 50) * 0.08
        view.mesh.position.y -= 0.08
        view.top.emissive.setHex(GUIDE_COLORS.wrong)
        view.top.emissiveIntensity = 0.8
        view.side.emissive.setHex(GUIDE_COLORS.wrong)
        view.side.emissiveIntensity = 0.6
        break
      default:
        view.top.emissive.setHex(0x000000)
        view.top.emissiveIntensity = 0
        view.side.emissive.setHex(0x000000)
        view.side.emissiveIntensity = 0
    }
  }

  private createKey(def: KeyDef): void {
    const c = keyCenter(def)
    const width = def.width * KEY_PITCH - 0.12
    const geo = new THREE.BoxGeometry(width, KEY_HEIGHT, ROW_DEPTH - 0.12)
    const finger = FINGERS[def.finger]
    const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(finger.color).multiplyScalar(0.55) })
    const top = new THREE.MeshLambertMaterial({ map: makeKeyTexture(def, finger.cssColor), color: 0xffffff })
    // BoxGeometry の面の順: +x, -x, +y(上), -y, +z, -z
    const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side])
    const home = new THREE.Vector3((c.x - LAYOUT_CENTER_X) * KEY_PITCH, KEY_HEIGHT / 2, (c.y - 1.5) * ROW_DEPTH)
    mesh.position.copy(home)
    this.scene.add(mesh)
    this.keys.set(def.code, { def, mesh, top, side, home })
  }

  private createHands(): void {
    const fingerLength: Partial<Record<FingerId, number>> = {
      L_PINKY: 7, L_RING: 8, L_MIDDLE: 9, L_INDEX: 8, R_INDEX: 8, R_MIDDLE: 9, R_RING: 8, R_PINKY: 7,
    }
    for (const id of Object.keys(HOME_KEYS) as FingerId[]) {
      if (id === 'THUMB') continue
      const key = this.keys.get(HOME_KEYS[id])!
      const len = fingerLength[id] ?? 4
      const g = new VoxelGrid()
      // 指先（指の色）→ 根元（はだいろ）。+z が手前
      for (let k = 0; k < len; k++) g.box(0, 0, k, 2, 2, 1, k < 2 ? FINGERS[id].color : SKIN)
      // キーが隠れないように半透明にする
      const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })
      const mesh = new VoxelMesh(g.voxels(), { size: 0.24, material })
      mesh.position.z = ((len - 1) * 0.24) / 2
      const group = new THREE.Group()
      group.add(mesh)
      const home = new THREE.Vector3(key.home.x, KEY_HEIGHT + 0.15, key.home.z + 0.1)
      group.position.copy(home)
      this.scene.add(group)
      this.fingers.set(id, { id, group, mesh, material, home, target: home.clone() })
    }

    // てのひら と おやゆび
    for (const side of ['left', 'right'] as const) {
      const ids: FingerId[] = side === 'left' ? ['L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX'] : ['R_INDEX', 'R_MIDDLE', 'R_RING', 'R_PINKY']
      const xs = ids.map((id) => this.fingers.get(id)!.home.x)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const g = new VoxelGrid()
      g.box(0, 0, 0, 14, 2, 6, SKIN)
      // おやゆび（スペースキーの上へのびる）
      const thumbX = side === 'left' ? 11 : 0
      g.box(thumbX, 0, -3, 3, 2, 3, SKIN)
      g.box(thumbX, 0, -4, 3, 2, 1, FINGERS.THUMB.color)
      const palm = new THREE.Group()
      const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
      const mesh = new VoxelMesh(g.voxels(), { size: 0.24, material })
      palm.add(mesh)
      palm.position.set(cx, 0.55, this.fingers.get(ids[0])!.home.z + 2.9)
      palm.rotation.y = side === 'left' ? -0.12 : 0.12
      this.scene.add(palm)
      this.palms.push(palm)
    }
  }
}

function makeKeyTexture(def: KeyDef, fingerColor: string): THREE.CanvasTexture {
  const w = def.width > 1 ? 512 : 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(0, 0, w, 128)
  ctx.fillStyle = fingerColor
  ctx.fillRect(0, 112, w, 16)
  ctx.fillStyle = '#2a2a3a'
  ctx.font = `bold ${def.width > 1 ? 56 : 80}px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(def.label, w / 2, 58)
  // F と J の でっぱり
  if (def.code === 'F' || def.code === 'J') ctx.fillRect(w / 2 - 18, 96, 36, 6)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
