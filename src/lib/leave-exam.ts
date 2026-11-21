/** End the current attempt before allowing navigation away from the exam. */
export async function leaveExam(saveAnswers: () => Promise<void>, endAttempt: () => Promise<void>, exit: () => Promise<void>) {
  await saveAnswers();
  await endAttempt();
  await exit();
}