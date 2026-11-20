/** Share of marks a student needs to pass an exam. */
export const PASS_PERCENT = 40;
/** Seconds left before the server deadline, using the server clock offset. */
export function secondsLeft(deadline: string, serverNow: string, loadedAt: number, now = Date.now()) {
  const offset = Date.parse(serverNow) - loadedAt;
  return Math.max(0, Math.floor((Date.parse(deadline) - (now + offset)) / 1000));
}
export function percentOf(score: number, total: number) { return total > 0 ? Math.round((score / total) * 1000) / 10 : 0; }
export function passed(score: number, total: number, passPercent = PASS_PERCENT) { return percentOf(score, total) >= passPercent; }
export function formatClock(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
