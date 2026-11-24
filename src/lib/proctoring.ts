/** Number of tab-switch warnings a student gets; the next switch cancels the attempt (enforced server-side too). */
export const MAX_WARNINGS = 3;
export const feedbackKey = (attemptId: string) => `examhub-feedback-${attemptId}`;
/** Copy/cut/context-menu is blocked everywhere except inside the student's own answer box. */
export function isViolationTarget(target: EventTarget | null): boolean {
  return !(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement);
}
/** Mirrors report_tab_switch: switches 1..MAX warn, MAX+1 cancels. */
export const outcomeFor = (switches: number) => (switches > MAX_WARNINGS ? "cancelled" : "warning");
