// コースごとの さいこう記録（このブラウザの localStorage に保存）

const keyFor = (courseId: string) => `voxel-typing-quest:best:${courseId}`

export function loadBest(courseId: string): number {
  try {
    const value = Number(localStorage.getItem(keyFor(courseId)))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

/** 記録を更新したら true */
export function saveBest(courseId: string, score: number): boolean {
  if (score <= loadBest(courseId)) return false
  try {
    localStorage.setItem(keyFor(courseId), String(score))
  } catch {
    // 保存できない環境（プライベートモード等）でも、今回の しんきろく表示はする
  }
  return true
}
