export type RacePreviewRacer = {
  id: string;
  name: string;
  wpm: number;
  progress: number;
  detail?: string;
};

export const RACE_PREVIEW: RacePreviewRacer[] = [
  { id: "Manzi", name: "Manzi", wpm: 86, progress: 78 },
  { id: "Mugabo", name: "Mugabo", wpm: 74, progress: 64 },
  { id: "Christellè", name: "Christellè", wpm: 61, progress: 51 },
  { id: "Keza", name: "Keza", wpm: 48, progress: 39 },
];
