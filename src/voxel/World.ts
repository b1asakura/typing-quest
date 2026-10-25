// マイクラ風の背景ワールド（地面・木・雲・飾り）
import * as THREE from 'three'
import type { CourseTheme } from '../data/courses.ts'
import { createCloud, createCrystal, createTree } from './models.ts'
import { VoxelMesh, jitter, pseudoRandom, sharedBox } from './VoxelBuilder.ts'

const GROUND_W = 41
const GROUND_D = 70
const GROUND_Z0 = 10

export class World {
  readonly group = new THREE.Group()
  private clouds: VoxelMesh[] = []
  private lavaMaterial: THREE.MeshLambertMaterial | null = null
  private time = 0

  readonly scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    scene.add(this.group)
  }

  build(theme: CourseTheme): void {
    this.clear()
    this.scene.background = new THREE.Color(theme.sky)
    this.scene.fog = new THREE.Fog(theme.fog, 18, 55)

    this.buildGround(theme)
    if (theme.decor === 'trees' || theme.decor === 'flowers') this.buildTrees(theme.decor === 'flowers' ? 10 : 18)
    if (theme.decor === 'flowers') this.buildFlowers()
    if (theme.decor === 'crystals') this.buildCrystals()
    if (theme.decor === 'lava') this.buildLava()
    if (theme.decor !== 'crystals') this.buildClouds()
  }

  update(dt: number): void {
    this.time += dt
    for (const c of this.clouds) {
      c.position.x += dt * 0.6
      if (c.position.x > 40) c.position.x = -40
    }
    if (this.lavaMaterial) this.lavaMaterial.emissiveIntensity = 0.7 + Math.sin(this.time * 2) * 0.2
  }

  private buildGround(theme: CourseTheme): void {
    const count = GROUND_W * GROUND_D
    const grass = new THREE.InstancedMesh(sharedBox, new THREE.MeshLambertMaterial({ color: 0xffffff }), count)
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    let i = 0
    for (let x = 0; x < GROUND_W; x++) {
      for (let z = 0; z < GROUND_D; z++) {
        const wx = x - (GROUND_W - 1) / 2
        const wz = GROUND_Z0 - z
        // 道の外側は少しでこぼこ
        const far = Math.abs(wx) > 4
        const bump = far ? Math.floor(pseudoRandom(x * 97 + z * 13) * 2.2) * (Math.abs(wx) > 9 ? 1 : 0) : 0
        m.makeTranslation(wx, -0.5 + bump, wz)
        grass.setMatrixAt(i, m)
        const onPath = Math.abs(wx) <= 1.5
        const base = onPath ? theme.groundSide : theme.ground
        c.setHex(jitter(base, 0.1, x * 31 + z * 7))
        grass.setColorAt(i, c)
        i++
      }
    }
    grass.receiveShadow = true
    this.group.add(grass)
  }

  private buildTrees(n: number): void {
    for (let k = 0; k < n; k++) {
      const tree = createTree(k * 5 + 1)
      const side = k % 2 === 0 ? -1 : 1
      const x = side * (6 + pseudoRandom(k * 3) * 12)
      const z = 4 - pseudoRandom(k * 7 + 2) * 50
      tree.position.set(x, 0, z)
      this.group.add(tree)
    }
  }

  private buildFlowers(): void {
    const colors = [0xff6a8a, 0xffe14a, 0xffffff, 0xb07aff]
    const flowers = new THREE.InstancedMesh(sharedBox, new THREE.MeshLambertMaterial({ color: 0xffffff }), 160)
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    for (let i = 0; i < 160; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (2.3 + pseudoRandom(i * 3.1) * 16)
      const z = 6 - pseudoRandom(i * 1.7) * 45
      m.compose(new THREE.Vector3(x, 0.15, z), new THREE.Quaternion(), new THREE.Vector3(0.3, 0.3, 0.3))
      flowers.setMatrixAt(i, m)
      flowers.setColorAt(i, c.setHex(colors[i % colors.length]))
    }
    this.group.add(flowers)
  }

  private buildCrystals(): void {
    const colors = [0xb07aff, 0x7ad8ff, 0xff7ad8]
    for (let k = 0; k < 22; k++) {
      const crystal = createCrystal(k, colors[k % colors.length])
      const side = k % 2 === 0 ? -1 : 1
      crystal.position.set(side * (4 + pseudoRandom(k * 9) * 12), 0, 4 - pseudoRandom(k * 5) * 45)
      crystal.rotation.y = pseudoRandom(k) * Math.PI
      this.group.add(crystal)
    }
    // どうくつの天井
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(60, 1, 80),
      new THREE.MeshLambertMaterial({ color: 0x2a2838, side: THREE.DoubleSide }),
    )
    ceiling.position.set(0, 12, -25)
    this.group.add(ceiling)
  }

  private buildLava(): void {
    this.lavaMaterial = new THREE.MeshLambertMaterial({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: 0.8 })
    const count = 120
    const lava = new THREE.InstancedMesh(sharedBox, this.lavaMaterial, count)
    const m = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (5 + pseudoRandom(i * 2.3) * 14)
      const z = 6 - pseudoRandom(i * 4.1) * 50
      m.makeTranslation(Math.round(x), 0.02, Math.round(z))
      m.scale(new THREE.Vector3(1, 0.06, 1))
      lava.setMatrixAt(i, m)
    }
    this.group.add(lava)
    // とおくの かざん
    const volcano = new VoxelMesh(
      (() => {
        const vox = []
        for (let y = 0; y < 8; y++) {
          const r = 8 - y
          for (let x = -r; x <= r; x++)
            vox.push({ x, y, z: 0, color: y === 7 && Math.abs(x) < 1 ? 0xff5a00 : jitter(0x4a3a38, 0.1, x + y * 17) })
        }
        return vox
      })(),
      { size: 2.5 },
    )
    volcano.position.set(4, 0, -48)
    this.group.add(volcano)
  }

  private buildClouds(): void {
    for (let k = 0; k < 9; k++) {
      const cloud = createCloud(k * 11)
      cloud.position.set(-40 + pseudoRandom(k * 3) * 80, 13 + pseudoRandom(k) * 5, -10 - pseudoRandom(k * 7) * 35)
      this.clouds.push(cloud)
      this.group.add(cloud)
    }
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      if (child instanceof THREE.Mesh) {
        if (child.geometry !== sharedBox) child.geometry.dispose()
        const mat = child.material as THREE.Material | THREE.Material[]
        ;(Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose())
        if (child instanceof THREE.InstancedMesh) child.dispose()
      }
    }
    this.clouds = []
    this.lavaMaterial = null
  }
}
