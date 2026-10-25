// モンスター・鉱石・道具・背景オブジェクトのボクセルモデル
import * as THREE from 'three'
import { VoxelGrid, VoxelMesh, jitter, pseudoRandom } from './VoxelBuilder.ts'

export type MonsterKind = 'slime' | 'zombie' | 'skeleton'
export type OreKind = 'gold' | 'diamond'

export const MONSTER_KINDS: MonsterKind[] = ['slime', 'zombie', 'skeleton']

// ---------------- モンスター（正面 = +z） ----------------

function slime(): VoxelGrid {
  const g = new VoxelGrid()
  const body = 0x6fdc5a
  g.box(0, 0, 0, 8, 7, 8, (x, y, z) => jitter(body, 0.06, x * 31 + y * 17 + z * 7))
  // 角を落として丸っこく
  for (const [x, z] of [[0, 0], [7, 0], [0, 7], [7, 7]]) for (let y = 0; y < 7; y++) g.remove(x, y, z)
  for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (x === 0 || x === 7 || z === 0 || z === 7) g.remove(x, 6, z)
  g.sprite(
    [
      '.KK..KK.',
      '.KW..KW.',
      '........',
      '...PP...',
    ],
    { K: 0x1f3a1a, W: 0xffffff, P: 0x2a5a24 },
    0, 2, 7,
  )
  g.set(1, 2, 7, 0xff9ab0).set(6, 2, 7, 0xff9ab0) // ほっぺ
  return g
}

function zombie(): VoxelGrid {
  const g = new VoxelGrid()
  const skin = 0x6aa84f
  const shirt = 0x2fa3b5
  const pants = 0x4a3fa0
  // あし
  g.box(0, 0, 0, 3, 8, 3, (x, y, z) => jitter(pants, 0.05, x + y * 5 + z * 9))
  g.box(3, 0, 0, 3, 8, 3, (x, y, z) => jitter(pants, 0.05, x + y * 5 + z * 9))
  // からだ
  g.box(0, 8, 0, 6, 8, 3, (x, y, z) => jitter(shirt, 0.06, x * 3 + y * 7 + z))
  // うで（前にのばす）
  g.box(-3, 13, 0, 3, 3, 7, (x, y, z) => (z > 3 ? jitter(skin, 0.06, x + y + z) : jitter(shirt, 0.06, x + y + z)))
  g.box(6, 13, 0, 3, 3, 7, (x, y, z) => (z > 3 ? jitter(skin, 0.06, x + y + z) : jitter(shirt, 0.06, x + y + z)))
  // あたま
  g.box(0, 16, -1, 6, 6, 6, (x, y, z) => jitter(skin, 0.07, x * 11 + y * 3 + z * 5))
  g.sprite(
    [
      '......',
      'KW..KW',
      'KK..KK',
      '......',
      '.DDDD.',
      '......',
    ],
    { K: 0x1a2a12, W: 0xffffff, D: 0x3d5e2d },
    0, 16, 4,
  )
  return g
}

function skeleton(): VoxelGrid {
  const g = new VoxelGrid()
  const bone = 0xe4e4dc
  const dark = 0x9a9a92
  g.box(1, 0, 1, 2, 9, 2, (x, y, z) => jitter(bone, 0.05, x + y * 3 + z))
  g.box(4, 0, 1, 2, 9, 2, (x, y, z) => jitter(bone, 0.05, x + y * 3 + z))
  g.box(0, 9, 1, 7, 8, 2, (x, y, z) => ((y % 2 === 0 && x > 0 && x < 6) ? dark : jitter(bone, 0.05, x + y + z)))
  g.box(-2, 10, 1, 2, 7, 2, bone)
  g.box(7, 10, 1, 2, 7, 2, bone)
  // ゆみ
  g.box(9, 9, 2, 1, 1, 3, 0x8a5a2b).box(9, 10, 5, 1, 6, 1, 0x8a5a2b).box(9, 16, 2, 1, 1, 3, 0x8a5a2b)
  g.box(0, 17, -1, 7, 6, 6, (x, y, z) => jitter(bone, 0.05, x * 7 + y + z * 3))
  g.sprite(
    [
      '.......',
      '.KK.KK.',
      '.KW.KW.',
      '...K...',
      '.KKKKK.',
      '.......',
    ],
    { K: 0x2a2a2a, W: 0xffffff },
    0, 17, 4,
  )
  return g
}

const MONSTER_BUILDERS: Record<MonsterKind, { grid: () => VoxelGrid; size: number }> = {
  slime: { grid: slime, size: 0.2 },
  zombie: { grid: zombie, size: 0.085 },
  skeleton: { grid: skeleton, size: 0.08 },
}

export function createMonster(kind: MonsterKind): VoxelMesh {
  const { grid, size } = MONSTER_BUILDERS[kind]
  const mesh = new VoxelMesh(grid().voxels(), { size, gap: 0.02 })
  mesh.name = kind
  return mesh
}

// ---------------- 鉱石 ----------------

export const ORE_COLORS: Record<OreKind, { gem: number; light: number; glow: number }> = {
  gold: { gem: 0xffc928, light: 0xfff0a0, glow: 0xffb000 },
  diamond: { gem: 0x47e8f0, light: 0xc8ffff, glow: 0x30d0ff },
}

export const ORE_GRID = 6

export function createOre(kind: OreKind): VoxelMesh {
  const g = new VoxelGrid()
  const { gem, light } = ORE_COLORS[kind]
  const n = ORE_GRID
  let seed = kind === 'gold' ? 3 : 11
  g.box(0, 0, 0, n, n, n, (x, y, z) => {
    seed++
    const surface = x === 0 || y === 0 || z === 0 || x === n - 1 || y === n - 1 || z === n - 1
    const r = pseudoRandom(seed * 7.13)
    if (surface && r < 0.22) return r < 0.07 ? light : jitter(gem, 0.08, seed)
    return jitter(0x8c8c8c, 0.12, seed + x)
  })
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 })
  const mesh = new VoxelMesh(g.voxels(), { size: 0.3, material, gap: 0.01 })
  mesh.name = `${kind}-ore`
  return mesh
}

// ---------------- 道具（一人称で持つ） ----------------

export function createSword(): VoxelMesh {
  const g = new VoxelGrid()
  const blade = 0x7ff3ff
  const edge = 0xd8ffff
  for (let i = 0; i < 11; i++) g.set(0, 4 + i, 0, i % 3 === 0 ? edge : blade)
  g.set(0, 15, 0, edge)
  g.box(-2, 3, 0, 5, 1, 1, 0x3a3a3a)
  g.box(0, 0, 0, 1, 3, 1, 0x7a4a22)
  return new VoxelMesh(g.voxels(), { size: 0.07 })
}

export function createPickaxe(): VoxelMesh {
  const g = new VoxelGrid()
  g.box(0, 0, 0, 1, 12, 1, (_x, y) => (y % 2 ? 0x8a5a2b : 0x7a4a22))
  const head = 0x7ff3ff
  g.box(-4, 11, 0, 9, 1, 1, head)
  g.set(-5, 10, 0, head).set(5, 10, 0, head).set(-6, 9, 0, head).set(6, 9, 0, head)
  g.box(-1, 12, 0, 3, 1, 1, 0x4fc8d8)
  return new VoxelMesh(g.voxels(), { size: 0.07 })
}

/** 斬撃エフェクト（三日月形にならんだ光るボクセル） */
export function createSlash(): VoxelMesh {
  const g = new VoxelGrid()
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 0.9 - Math.PI * 0.45
    const r = 9
    const thick = i > 4 && i < 20 ? 2 : 1
    for (let t = 0; t < thick; t++) {
      g.set(Math.round(Math.sin(a) * (r - t)), Math.round(Math.cos(a) * (r - t)), 0, 0xffffff)
    }
  }
  const material = new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.9, depthWrite: false })
  const mesh = new VoxelMesh(g.voxels(), { size: 0.12, origin: 'center', material })
  mesh.castShadow = false
  return mesh
}

// ---------------- 背景 ----------------

export function createTree(seed: number): VoxelMesh {
  const g = new VoxelGrid()
  const h = 3 + Math.floor(pseudoRandom(seed) * 3)
  g.box(0, 0, 0, 1, h, 1, (_x, y) => jitter(0x8a5a2b, 0.08, seed + y))
  g.box(-2, h - 1, -2, 5, 2, 5, (x, y, z) => jitter(0x3f9f3a, 0.12, seed + x * 5 + y * 3 + z))
  g.box(-1, h + 1, -1, 3, 1, 3, (x, y, z) => jitter(0x4fbf45, 0.1, seed + x + y + z * 3))
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.remove(x, h, z)
  return new VoxelMesh(g.voxels(), { size: 1 })
}

export function createCrystal(seed: number, color: number): VoxelMesh {
  const g = new VoxelGrid()
  const h = 2 + Math.floor(pseudoRandom(seed) * 3)
  g.box(0, 0, 0, 1, h, 1, color)
  g.set(1, 0, 0, color).set(0, 0, 1, color)
  if (h > 2) g.set(-1, 1, 0, color)
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.6 })
  return new VoxelMesh(g.voxels(), { size: 0.7, material })
}

export function createCloud(seed: number): VoxelMesh {
  const g = new VoxelGrid()
  const w = 4 + Math.floor(pseudoRandom(seed) * 4)
  const d = 2 + Math.floor(pseudoRandom(seed + 1) * 3)
  g.box(0, 0, 0, w, 1, d, 0xffffff)
  g.box(1, 1, 0, w - 2, 1, d - 1, 0xffffff)
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 })
  const mesh = new VoxelMesh(g.voxels(), { size: 1.4, material })
  mesh.castShadow = false
  return mesh
}
