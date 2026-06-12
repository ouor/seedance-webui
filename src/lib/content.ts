// Assembles the ModelArk `content` array from the chosen mode, prompt, and
// uploaded media — applying the role rules (first/last frame vs reference).
import type { ContentPart, ModeId, UploadedMedia } from "./types";

export function buildContent(
  mode: ModeId,
  prompt: string,
  images: UploadedMedia[],
  videos: UploadedMedia[],
  audios: UploadedMedia[],
): ContentPart[] {
  const content: ContentPart[] = [];
  const text = prompt.trim();
  if (text) content.push({ type: "text", text });

  if (mode === "image") {
    if (images[0]) content.push({ type: "image_url", role: "first_frame", image_url: { url: images[0].url } });
  } else if (mode === "frames") {
    if (images[0]) content.push({ type: "image_url", role: "first_frame", image_url: { url: images[0].url } });
    if (images[1]) content.push({ type: "image_url", role: "last_frame", image_url: { url: images[1].url } });
  } else if (mode === "multi" || mode === "video") {
    for (const img of images) content.push({ type: "image_url", role: "reference_image", image_url: { url: img.url } });
    for (const vid of videos) content.push({ type: "video_url", role: "reference_video", video_url: { url: vid.url } });
  }

  // audio is a reference input — only valid alongside an image or video
  if (mode !== "text" && mode !== "frames") {
    for (const aud of audios) content.push({ type: "audio_url", role: "reference_audio", audio_url: { url: aud.url } });
  }

  return content;
}
