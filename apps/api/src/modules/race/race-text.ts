export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function composeRaceText(
  sentences: readonly string[],
  minWords: number,
  maxWords: number,
  random: () => number = Math.random,
): string {
  if (minWords < 1 || maxWords < minWords) {
    throw new Error('Race word range is invalid');
  }

  const pool = shuffle(
    sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0),
    random,
  );
  const chosen: string[] = [];
  let words = 0;

  for (const sentence of pool) {
    if (words >= minWords) {
      break;
    }
    const count = countWords(sentence);
    if (count === 0 || words + count > maxWords) {
      continue;
    }
    chosen.push(sentence);
    words += count;
  }

  if (chosen.length === 0 || words < minWords || words > maxWords) {
    throw new Error('Could not build a race passage in the configured word range');
  }

  return chosen.join(' ');
}

function shuffle(items: string[], random: () => number): string[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}
