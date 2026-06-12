import type { ModeId } from "./types";

export interface ModeDef {
  id: ModeId;
  label: string;
  desc: string;
  icon: string;
  images: [number, number]; // [min, max]
  videos: boolean;
  audio: boolean;
  needsPrompt: boolean;
}

export const MODES: ModeDef[] = [
  { id: "text", label: "텍스트 → 영상", desc: "글만", icon: "text", images: [0, 0], videos: false, audio: false, needsPrompt: true },
  { id: "image", label: "이미지 → 영상", desc: "사진 1장", icon: "image", images: [1, 1], videos: false, audio: true, needsPrompt: false },
  { id: "frames", label: "첫·마지막 프레임", desc: "사진 2장", icon: "frames", images: [2, 2], videos: false, audio: false, needsPrompt: false },
  { id: "multi", label: "멀티모달 참조", desc: "사진 1~9장", icon: "layers", images: [1, 9], videos: true, audio: true, needsPrompt: false },
  { id: "video", label: "영상 편집·확장", desc: "영상", icon: "video", images: [0, 9], videos: true, audio: true, needsPrompt: false },
];

export function getMode(id: ModeId): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
