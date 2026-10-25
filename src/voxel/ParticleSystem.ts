// ボクセル飛散パーティクル
// 固定長のプール（1つの InstancedMesh）を使い回す。物理は 重力 ＋ 床バウンド ＋ プレイヤーへの吸引 だけ。
import * as THREE from 'three'
import { sharedBox } from './VoxelBuilder.ts'

export interface BurstOptions {
  count?: number
  speed?: number
  upward?: number
  size?: number
  /** 地面で跳ねたあとプレイヤーに吸い込まれるか */
  attract?: boolean
  /** 吸引しない場合の寿命（秒） */
  life?: number
  /** 光らせる（宝石用） */
  glow?: boolean
}

const GRAVITY = -18
const FLOOR_Y = 0
const BOUNCE = 0.45
const FRICTION = 0.8
const ATTRACT_DELAY = 0.9
const ABSORB_DISTANCE = 0.8

export class ParticleSystem {
  readonly mesh: THREE.InstancedMesh
  private readonly capacity: number
  private readonly pos: Float32Array
  private readonly vel: Float32Array
  private readonly rot: Float32Array
  private readonly spin: Float32Array
  private readonly age: Float32Array
  private readonly life: Float32Array
  private readonly size: Float32Array
  private readonly flags: Uint8Array
  private next = 0
  private readonly tmpMatrix = new THREE.Matrix4()
  private readonly tmpQuat = new THREE.Quaternion()
  private readonly tmpEuler = new THREE.Euler()
  private readonly tmpPos = new THREE.Vector3()
  private readonly tmpScale = new THREE.Vector3()
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0)

  /** パーティクルがプレイヤーに吸い込まれた回数のコールバック */
  onAbsorb: (() => void) | null = null

  constructor(capacity = 2500) {
    this.capacity = capacity
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff })
    this.mesh = new THREE.InstancedMesh(sharedBox, material, capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false
    this.mesh.castShadow = true
    this.pos = new Float32Array(capacity * 3)
    this.vel = new Float32Array(capacity * 3)
    this.rot = new Float32Array(capacity * 3)
    this.spin = new Float32Array(capacity * 3)
    this.age = new Float32Array(capacity)
    this.life = new Float32Array(capacity)
    this.size = new Float32Array(capacity)
    this.flags = new Uint8Array(capacity) // bit0: alive, bit1: attract
    const white = new THREE.Color(0xffffff)
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, this.zero)
      this.mesh.setColorAt(i, white)
    }
  }

  /** 1つのボクセルを飛ばす */
  emit(position: THREE.Vector3, color: THREE.Color | number, velocity: THREE.Vector3, opts: BurstOptions = {}): void {
    const i = this.next
    this.next = (this.next + 1) % this.capacity
    const i3 = i * 3
    this.pos[i3] = position.x
    this.pos[i3 + 1] = position.y
    this.pos[i3 + 2] = position.z
    this.vel[i3] = velocity.x
    this.vel[i3 + 1] = velocity.y
    this.vel[i3 + 2] = velocity.z
    for (let k = 0; k < 3; k++) {
      this.rot[i3 + k] = Math.random() * Math.PI
      this.spin[i3 + k] = (Math.random() - 0.5) * 12
    }
    this.age[i] = 0
    this.life[i] = (opts.life ?? 1.6) * (0.8 + Math.random() * 0.4)
    this.size[i] = (opts.size ?? 0.12) * (0.8 + Math.random() * 0.4)
    this.flags[i] = 1 | (opts.attract ? 2 : 0)
    const c = color instanceof THREE.Color ? color.clone() : new THREE.Color(color)
    if (opts.glow) c.multiplyScalar(1.4)
    this.mesh.setColorAt(i, c)
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  /** ある点から色のついたボクセルを放射状に飛ばす */
  burst(origin: THREE.Vector3, colors: number[], opts: BurstOptions = {}): void {
    const count = opts.count ?? 20
    const speed = opts.speed ?? 5
    const up = opts.upward ?? 5
    const v = new THREE.Vector3()
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2
      const s = speed * (0.4 + Math.random() * 0.8)
      v.set(Math.cos(a) * s, up * (0.5 + Math.random() * 0.8), Math.sin(a) * s)
      this.emit(origin, colors[n % colors.length], v, opts)
    }
  }

  /** モデルのボクセルをそのままバラバラにする */
  shatter(voxels: { position: THREE.Vector3; color: THREE.Color }[], center: THREE.Vector3, opts: BurstOptions = {}): void {
    const max = opts.count ?? 80
    const step = Math.max(1, Math.floor(voxels.length / max))
    const speed = opts.speed ?? 6
    const v = new THREE.Vector3()
    for (let i = 0; i < voxels.length; i += step) {
      const { position, color } = voxels[i]
      v.copy(position).sub(center)
      v.y = Math.max(v.y, 0) + 0.5
      v.normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.8))
      v.y += 3 + Math.random() * 3
      this.emit(position, color, v, opts)
    }
  }

  update(dt: number, target: THREE.Vector3): void {
    const step = Math.min(dt, 1 / 30)
    let any = false
    for (let i = 0; i < this.capacity; i++) {
      const f = this.flags[i]
      if (!(f & 1)) continue
      any = true
      const i3 = i * 3
      this.age[i] += step
      const age = this.age[i]
      const attract = (f & 2) !== 0
      let scale = this.size[i]

      if (attract && age > ATTRACT_DELAY) {
        // プレイヤー（スコア）へ吸い込まれる
        const dx = target.x - this.pos[i3]
        const dy = target.y - this.pos[i3 + 1]
        const dz = target.z - this.pos[i3 + 2]
        const dist = Math.hypot(dx, dy, dz)
        if (dist < ABSORB_DISTANCE) {
          this.kill(i)
          this.onAbsorb?.()
          continue
        }
        const pull = 30 + (age - ATTRACT_DELAY) * 60
        this.vel[i3] += (dx / dist) * pull * step
        this.vel[i3 + 1] += (dy / dist) * pull * step
        this.vel[i3 + 2] += (dz / dist) * pull * step
        const damp = Math.pow(0.1, step)
        this.vel[i3] *= damp
        this.vel[i3 + 1] *= damp
        this.vel[i3 + 2] *= damp
        if (age > ATTRACT_DELAY + 3) {
          this.kill(i)
          continue
        }
      } else {
        this.vel[i3 + 1] += GRAVITY * step
        if (!attract) {
          const remain = this.life[i] - age
          if (remain <= 0) {
            this.kill(i)
            continue
          }
          if (remain < 0.4) scale *= remain / 0.4
        }
      }

      this.pos[i3] += this.vel[i3] * step
      this.pos[i3 + 1] += this.vel[i3 + 1] * step
      this.pos[i3 + 2] += this.vel[i3 + 2] * step

      // 床バウンド
      const floor = FLOOR_Y + scale / 2
      if (this.pos[i3 + 1] < floor && !(attract && age > ATTRACT_DELAY)) {
        this.pos[i3 + 1] = floor
        if (this.vel[i3 + 1] < 0) this.vel[i3 + 1] = -this.vel[i3 + 1] * BOUNCE
        this.vel[i3] *= FRICTION
        this.vel[i3 + 2] *= FRICTION
        this.spin[i3] *= 0.7
        this.spin[i3 + 2] *= 0.7
      }

      this.rot[i3] += this.spin[i3] * step
      this.rot[i3 + 1] += this.spin[i3 + 1] * step
      this.rot[i3 + 2] += this.spin[i3 + 2] * step
      this.tmpEuler.set(this.rot[i3], this.rot[i3 + 1], this.rot[i3 + 2])
      this.tmpQuat.setFromEuler(this.tmpEuler)
      this.tmpPos.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2])
      this.tmpScale.setScalar(scale)
      this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
      this.mesh.setMatrixAt(i, this.tmpMatrix)
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true
  }

  clear(): void {
    for (let i = 0; i < this.capacity; i++) if (this.flags[i] & 1) this.kill(i)
    this.mesh.instanceMatrix.needsUpdate = true
  }

  private kill(i: number): void {
    this.flags[i] = 0
    this.mesh.setMatrixAt(i, this.zero)
  }
}
