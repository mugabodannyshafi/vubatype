export type RacePreviewRacer = {
  id: string;
  name: string;
  wpm: number;
  progress: number;
};

export const RACE_PREVIEW: RacePreviewRacer[] = [
  { id: "keza", name: "Keza", wpm: 86, progress: 78 },
  { id: "mugisha", name: "Mugisha", wpm: 74, progress: 64 },
  { id: "aline", name: "Aline", wpm: 61, progress: 51 },
  { id: "eric", name: "Eric", wpm: 48, progress: 39 },
];
