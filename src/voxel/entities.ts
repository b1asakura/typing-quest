// モンスターと鉱石の動き（見た目のアニメーションだけ。ゲームの判定は main.ts）
import * as THREE from 'three'
import { createMonster, createOre, ORE_COLORS, ORE_GRID, type MonsterKind, type OreKind } from './models.ts'
import type { VoxelMesh } from './VoxelBuilder.ts'

export const MONSTER_START_Z = -30
export const MONSTER_STOP_Z = 0
const WALK_SPEED = 6

export class Monster {
  readonly mesh: VoxelMesh
  readonly group = new THREE.Group()
  private time = Math.random() * 10
  private hurt = 0

  readonly kind: MonsterKind

  constructor(kind: MonsterKind) {
    this.kind = kind
    this.mesh = createMonster(kind)
    this.group.add(this.mesh)
    this.group.position.set((Math.random() - 0.5) * 1.5, 0, MONSTER_START_Z)
  }

  get arrived(): boolean {
    return this.group.position.z >= MONSTER_STOP_Z
  }

  /** ラベルを出す頭の上の位置 */
  labelAnchor(): THREE.Vector3 {
    const top = new THREE.Box3().setFromObject(this.mesh).max.y
    return new THREE.Vector3(this.group.position.x, top + 0.35, this.group.position.z)
  }

  center(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0))
  }

  /** 盾で弾かれたような小さいリアクション（ミス時） */
  block(): void {
    this.hurt = 0.3
  }

  update(dt: number): void {
    this.time += dt
    const p = this.group.position
    const walking = !this.arrived
    if (walking) p.z = Math.min(MONSTER_STOP_Z, p.z + WALK_SPEED * dt * (0.4 + Math.min(1, (p.z - MONSTER_START_Z) / 6)))

    if (this.kind === 'slime') {
      const hop = Math.abs(Math.sin(this.time * (walking ? 7 : 3)))
      this.mesh.position.y = hop * (walking ? 0.6 : 0.15)
      this.mesh.scale.set(1 + (1 - hop) * 0.12, 1 - (1 - hop) * 0.12, 1 + (1 - hop) * 0.12)
    } else {
      this.mesh.position.y = Math.abs(Math.sin(this.time * (walking ? 9 : 2))) * (walking ? 0.12 : 0.04)
      this.mesh.rotation.z = Math.sin(this.time * (walking ? 9 : 2)) * (walking ? 0.08 : 0.03)
    }
    if (this.hurt > 0) {
      this.hurt -= dt
      this.mesh.position.z = -Math.sin((this.hurt / 0.3) * Math.PI) * 0.25
    } else {
      this.mesh.position.z = 0
    }
  }
}

export type OreState = 'falling' | 'ready' | 'escaping' | 'gone'

export class Ore {
  readonly mesh: VoxelMesh
  readonly group = new THREE.Group()
  state: OreState = 'falling'
  private vy = 0
  private time = 0
  private shakeTime = 0
  private crackOrder: number[]
  private cracked = 0
  private material: THREE.MeshLambertMaterial

  readonly kind: OreKind

  constructor(kind: OreKind) {
    this.kind = kind
    this.mesh = createOre(kind)
    this.material = this.mesh.material as THREE.MeshLambertMaterial
    this.group.add(this.mesh)
    this.group.position.set(0, 12, 0)
    this.crackOrder = buildCrackOrder(this.mesh)
  }

  labelAnchor(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, ORE_GRID * 0.3 + 0.4, 0))
  }

  center(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, ORE_GRID * 0.15, 0))
  }

  /** progress (0〜1) に合わせてヒビを広げる */
  crack(progress: number): void {
    const target = Math.floor(this.crackOrder.length * Math.min(1, progress) * 0.5)
    for (; this.cracked < target; this.cracked++) {
      this.mesh.recolor(this.crackOrder[this.cracked], this.cracked % 3 === 0 ? 0x1a1a1a : 0x3a3a3a)
    }
    this.shakeTime = 0.2
  }

  /** 制限時間の残り割合に合わせて点滅（少なくなるほど速く） */
  setTimeLeft(ratio: number): void {
    const glow = ORE_COLORS[this.kind].glow
    if (ratio < 0.35) {
      const speed = 6 + (0.35 - ratio) * 40
      const k = (Math.sin(this.time * speed) + 1) / 2
      this.material.emissive.setHex(glow)
      this.material.emissiveIntensity = k * 0.8
    } else {
      this.material.emissive.setHex(glow)
      this.material.emissiveIntensity = 0.04
    }
  }

  /** 時間切れ: モコモコ地面にもぐって逃げる */
  escape(): void {
    this.state = 'escaping'
    this.material.emissiveIntensity = 0
  }

  update(dt: number): void {
    this.time += dt
    const p = this.group.position
    if (this.state === 'falling') {
      this.vy -= 30 * dt
      p.y += this.vy * dt
      if (p.y <= 0) {
        p.y = 0
        if (Math.abs(this.vy) > 4) this.vy = -this.vy * 0.35
        else {
          this.vy = 0
          this.state = 'ready'
        }
      }
    } else if (this.state === 'escaping') {
      p.y -= dt * 0.9
      const wobble = Math.sin(this.time * 18)
      this.mesh.scale.set(1 + wobble * 0.08, 1 - wobble * 0.08, 1 + wobble * 0.08)
      p.x = Math.sin(this.time * 9) * 0.1
      if (p.y < -ORE_GRID * 0.3 - 0.1) {
        this.state = 'gone'
        this.group.visible = false
      }
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt
      this.mesh.position.x = (Math.random() - 0.5) * 0.15
      this.mesh.rotation.y = (Math.random() - 0.5) * 0.1
    } else {
      this.mesh.position.x = 0
      this.mesh.rotation.y = 0
    }
  }
}

/** 正面の中央から広がるヒビの順番（表面のボクセルを、ゆらぎのある距離順に並べる） */
function buildCrackOrder(mesh: VoxelMesh): number[] {
  const n = ORE_GRID
  const candidates: { i: number; d: number }[] = []
  mesh.voxels.forEach((v, i) => {
    const front = v.z === n - 1
    const side = v.x === 0 || v.x === n - 1 || v.y === n - 1
    if (!front && !side) return
    const dx = v.x - (n - 1) / 2
    const dy = v.y - (n - 1) / 2
    const d = Math.hypot(dx, dy) + (front ? 0 : 3) + Math.random() * 1.8
    candidates.push({ i, d })
  })
  candidates.sort((a, b) => a.d - b.d)
  // ヒビっぽく見えるように一部だけ使う
  return candidates.filter((_, k) => k % 2 === 0 || Math.random() < 0.3).map((c) => c.i)
}
