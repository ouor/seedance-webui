export type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

export type ModeId = "text" | "image" | "frames" | "multi" | "video";

export interface GenOptions {
  resolution: "480p" | "720p" | "1080p";
  ratio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" | "adaptive";
  duration: number;
  generate_audio: boolean;
  watermark: boolean;
  seed?: number;
}

// one entry in the ModelArk `content` array
export interface ContentPart {
  type: "text" | "image_url" | "video_url" | "audio_url";
  text?: string;
  role?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
}

export interface Task {
  id: string;
  status: TaskStatus;
  mode: ModeId;
  model: string;
  prompt: string | null;
  params: GenOptions | null;
  inputMedia: Array<{ type: string; role: string | null }>;
  videoUrl: string | null;
  remoteVideoUrl: string | null;
  usageTokens: number | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface UploadedMedia {
  kind: "image" | "video" | "audio";
  url: string;
  key: string;
  name: string;
}

export const DEFAULT_OPTIONS: GenOptions = {
  resolution: "720p",
  ratio: "16:9",
  duration: 5,
  generate_audio: true,
  watermark: false,
};

// Seedance 2.0 (audio+video). Fast variant: dreamina-seedance-2-0-fast-260128.
// Confirm the exact id in your ModelArk console (Model activation) if it changes.
export const MODEL_ID = "dreamina-seedance-2-0-260128";
