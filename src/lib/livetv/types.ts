export type LiveCategory = "sports" | "general" | "news";

export type LiveChannel = {
  id: string;
  name: string;
  category: LiveCategory;
  provider: string;
};

export type ResolvedStream = {
  url: string;
  type: "hls" | "dash" | "iframe";
};

export interface LiveProvider {
  id: string;
  name: string;
  priority: number;
  getChannels(): Promise<LiveChannel[]>;
  resolveStream(channelId: string): Promise<ResolvedStream | null>;
}
