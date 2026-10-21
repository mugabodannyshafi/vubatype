export type PlayerStatus = "ready" | "typing" | "finished";

export type Player = {
  id: string;
  name: string;
  status: PlayerStatus;
  avatarUrl?: string;
};
