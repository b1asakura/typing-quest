// 1かいの プレイの ルール（せいげんじかん・コンボ）
// 数値はプレイしながら調整する前提。

export const GAME_RULES = {
  /** ゲーム全体の制限時間（秒）。レア鉱石が出てから結果が出るまでは止まる */
  totalTime: 60,
  /** これ以下になったら残り時間の表示をドキドキさせる（秒） */
  hurryTime: 10,
  /** ミスなしで何回つづけて成功したら制限時間がのびるか */
  comboForTimeBonus: 5,
  /** のびる秒数 */
  timeBonus: 2,
  /** コンボボーナス: 成功のたびに (コンボ数 - 1) × この点 を足す */
  comboScoreStep: 2,
  /** コンボボーナスの (コンボ数 - 1) の上限 */
  comboScoreCap: 10,
  /** 開始前のカウントダウン（3・2・1・スタート！）の数 */
  countdownFrom: 3,
  /** カウントダウン1つぶんの秒数 */
  countdownStep: 0.8,
  /** 結果画面が出てから、次のキー入力を受け付けるまでの秒数（打ちっぱなしで すぐ再スタートしないように） */
  resultInputDelay: 1.2,
} as const

export type GameRules = typeof GAME_RULES
