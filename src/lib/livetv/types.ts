export type LiveCategory = "sports" | "general" | "news";

export type LiveEventMeta = {
  league: string;
  kickoffUTC: string;
  order: number;
  badge?: string;
};

export type LiveChannel = {
  id: string;
  name: string;
  category: LiveCategory;
  provider: string;
  meta?: LiveEventMeta;
};

export type ResolvedStream = {
  url: string;
  type: "hls" | "dash" | "iframe";
};

export type MirrorCandidate = {
  id: string;
  label: string;
  priority: number;
};

export interface LiveProvider {
  id: string;
  name: string;
  priority: number;
  getChannels(): Promise<LiveChannel[]>;
  resolveStream(channelId: string): Promise<ResolvedStream | null>;
}
