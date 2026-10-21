const CHARS_PER_WORD = 5;
const MS_PER_MINUTE = 60_000;
const MIN_ELAPSED_MS = 1;

export type LiveTypingScore = {
  wpm: number;
  accuracy: number;
  progress: number;
  correctChars: number;
  incorrectChars: number;
};

export function scoreTyping(passage: string, typedText: string, elapsedMs: number): LiveTypingScore {
  const comparedLength = Math.min(typedText.length, passage.length);
  let correctChars = 0;
  let incorrectChars = 0;

  for (let index = 0; index < comparedLength; index += 1) {
    if (typedText[index] === passage[index]) {
      correctChars += 1;
    } else {
      incorrectChars += 1;
    }
  }

  if (typedText.length > passage.length) {
    incorrectChars += typedText.length - passage.length;
  }

  const typedChars = correctChars + incorrectChars;
  const minutes = Math.max(elapsedMs, MIN_ELAPSED_MS) / MS_PER_MINUTE;
  const wpm = typedChars === 0 ? 0 : correctChars / CHARS_PER_WORD / minutes;
  const accuracy = typedChars === 0 ? 0 : (correctChars / typedChars) * 100;
  const progress = passage.length === 0 ? 0 : Math.min(typedText.length, passage.length) / passage.length;

  return { wpm, accuracy, progress, correctChars, incorrectChars };
}
