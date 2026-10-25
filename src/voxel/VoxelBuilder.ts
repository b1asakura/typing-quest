// BoxGeometry ベースのプロシージャル・ボクセルビルダー
// モデルは「ボクセルの配列」で組み立て、1モデル = 1つの InstancedMesh（1ドローコール）で描く。
import * as THREE from 'three'

export interface Voxel {
  x: number
  y: number
  z: number
  color: number
}

export type ColorFn = (x: number, y: number, z: number) => number

/** ボクセルを書き込むためのキャンバス。同じ座標に書くと上書きされる。 */
export class VoxelGrid {
  private cells = new Map<string, Voxel>()

  set(x: number, y: number, z: number, color: number): this {
    this.cells.set(`${x},${y},${z}`, { x, y, z, color })
    return this
  }

  remove(x: number, y: number, z: number): this {
    this.cells.delete(`${x},${y},${z}`)
    return this
  }

  has(x: number, y: number, z: number): boolean {
    return this.cells.has(`${x},${y},${z}`)
  }

  /** 直方体を塗る（x0..x0+w-1 など） */
  box(x0: number, y0: number, z0: number, w: number, h: number, d: number, color: number | ColorFn): this {
    for (let x = x0; x < x0 + w; x++)
      for (let y = y0; y < y0 + h; y++)
        for (let z = z0; z < z0 + d; z++) this.set(x, y, z, typeof color === 'number' ? color : color(x, y, z))
    return this
  }

  /**
   * 文字の絵で1枚の面を描く（上の行が上）。'.' は空白。
   * palette の文字 → 色。z は奥行き位置。
   */
  sprite(rows: string[], palette: Record<string, number>, x0: number, y0: number, z: number): this {
    rows.forEach((row, r) => {
      const y = y0 + rows.length - 1 - r
      ;[...row].forEach((ch, c) => {
        const color = palette[ch]
        if (color !== undefined) this.set(x0 + c, y, z, color)
      })
    })
    return this
  }

  voxels(): Voxel[] {
    return [...this.cells.values()]
  }
}

export const sharedBox = new THREE.BoxGeometry(1, 1, 1)

export interface VoxelMeshOptions {
  /** 1ボクセルの大きさ（ワールド単位） */
  size: number
  /** 原点の位置: 'bottom' なら足元中央、'center' なら中心 */
  origin?: 'bottom' | 'center'
  material?: THREE.Material
  /** ボクセルの間にすき間をあける割合（マイクラっぽい輪郭） */
  gap?: number
}

/** ボクセル配列から InstancedMesh を作る */
export class VoxelMesh extends THREE.InstancedMesh {
  readonly voxels: Voxel[]
  readonly voxelSize: number
  /** 各ボクセルのローカル座標（パーティクル化に使う） */
  readonly localPositions: THREE.Vector3[]
  private readonly baseColors: THREE.Color[]

  constructor(voxels: Voxel[], options: VoxelMeshOptions) {
    const material = options.material ?? new THREE.MeshLambertMaterial({ color: 0xffffff })
    super(sharedBox, material, voxels.length)
    this.voxels = voxels
    this.voxelSize = options.size
    const gap = options.gap ?? 0
    const s = options.size

    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    for (const v of voxels) {
      min.min(new THREE.Vector3(v.x, v.y, v.z))
      max.max(new THREE.Vector3(v.x, v.y, v.z))
    }
    const center = min.clone().add(max).multiplyScalar(0.5)
    const yOffset = options.origin === 'center' ? center.y : min.y - 0.5

    const m = new THREE.Matrix4()
    const scale = new THREE.Vector3(s * (1 - gap), s * (1 - gap), s * (1 - gap))
    const q = new THREE.Quaternion()
    this.localPositions = []
    this.baseColors = []
    voxels.forEach((v, i) => {
      const p = new THREE.Vector3((v.x - center.x) * s, (v.y - yOffset) * s, (v.z - center.z) * s)
      this.localPositions.push(p)
      m.compose(p, q, scale)
      this.setMatrixAt(i, m)
      const c = new THREE.Color(v.color)
      this.baseColors.push(c)
      this.setColorAt(i, c)
    })
    this.instanceMatrix.needsUpdate = true
    if (this.instanceColor) this.instanceColor.needsUpdate = true
    this.castShadow = true
    this.receiveShadow = true
    this.computeBoundingSphere()
  }

  recolor(index: number, color: number | THREE.Color): void {
    this.setColorAt(index, color instanceof THREE.Color ? color : new THREE.Color(color))
    if (this.instanceColor) this.instanceColor.needsUpdate = true
  }

  resetColors(): void {
    this.baseColors.forEach((c, i) => this.setColorAt(i, c))
    if (this.instanceColor) this.instanceColor.needsUpdate = true
  }

  /** ボクセルのワールド座標と色（パーティクル化用） */
  worldVoxels(): { position: THREE.Vector3; color: THREE.Color }[] {
    this.updateWorldMatrix(true, false)
    const c = new THREE.Color()
    return this.localPositions.map((p, i) => {
      this.getColorAt(i, c)
      return { position: p.clone().applyMatrix4(this.matrixWorld), color: c.clone() }
    })
  }

  dispose(): void {
    ;(this.material as THREE.Material).dispose()
    super.dispose()
  }
}

/** 色に少しランダムなゆらぎを足す（ブロックっぽい質感） */
export function jitter(color: number, amount = 0.08, seed?: number): number {
  const r = seed === undefined ? Math.random() : pseudoRandom(seed)
  const c = new THREE.Color(color)
  const f = 1 + (r - 0.5) * 2 * amount
  c.r = Math.min(1, c.r * f)
  c.g = Math.min(1, c.g * f)
  c.b = Math.min(1, c.b * f)
  return c.getHex()
}

export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
