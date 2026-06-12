import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PillSet, StatusBadge, StepIndicator, Toggle } from "../components/ui";
import { MODES, getMode } from "../lib/modes";
import { buildContent } from "../lib/content";
import { createTask, uploadMedia } from "../lib/api";
import { getPreset, hasApiKey } from "../lib/store";
import { MODEL_ID, type GenOptions, type ModeId, type Task, type UploadedMedia } from "../lib/types";
import { useTasksCtx } from "../App";

const RES = ["480p", "720p", "1080p"] as const;
const RATIO = ["16:9", "9:16", "1:1", "4:3"] as const;
const DUR = [4, 6, 10, 15] as const;

function pseudoProgress(status: Task["status"]) {
  if (status === "queued") return 8;
  if (status === "running") return 55;
  return 100;
}

export default function Generate() {
  const { tasks, upsert } = useTasksCtx();
  const [mode, setMode] = useState<ModeId>("text");
  const [prompt, setPrompt] = useState("");
  const [opts, setOpts] = useState<GenOptions>(getPreset());
  const [images, setImages] = useState<UploadedMedia[]>([]);
  const [videos, setVideos] = useState<UploadedMedia[]>([]);
  const [audios, setAudios] = useState<UploadedMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const def = getMode(mode);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const audInput = useRef<HTMLInputElement>(null);

  async function pick(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: UploadedMedia["kind"],
    set: React.Dispatch<React.SetStateAction<UploadedMedia[]>>,
    max: number,
  ) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const f of files) {
      try {
        const m = await uploadMedia(f, kind);
        set((prev) => (prev.length < max ? [...prev, m] : prev));
      } catch (e2) {
        setErr((e2 as Error).message);
      }
    }
  }

  function validate(): string | null {
    if (!hasApiKey()) return "설정에서 API 키를 먼저 등록하세요.";
    if (def.needsPrompt && !prompt.trim()) return "프롬프트를 입력하세요.";
    const [min] = def.images;
    if (images.length < min) return `이미지를 ${min}장 이상 추가하세요.`;
    if (mode === "video" && videos.length === 0) return "참조 영상을 추가하세요.";
    if (audios.length > 0 && images.length === 0 && videos.length === 0)
      return "오디오는 이미지 또는 영상과 함께만 사용할 수 있습니다.";
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const content = buildContent(mode, prompt, images, videos, audios);
      const task = await createTask({ mode, model: MODEL_ID, content, options: opts });
      upsert(task);
      setImages([]);
      setVideos([]);
      setAudios([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const recent = tasks.slice(0, 6);

  return (
    <div className="app-body">
      {/* left rail — modes */}
      <aside
        style={{
          flex: "0 0 232px",
          borderRight: "1px solid var(--hairline)",
          background: "var(--surface-soft)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div className="caption" style={{ padding: "0 8px 10px" }}>
          생성 모드
        </div>
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--canvas)" : "transparent",
                border: active ? "1px solid var(--hairline)" : "1px solid transparent",
              }}
            >
              <Icon name={m.icon} size={18} color={active ? "var(--ink)" : "var(--muted)"} />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? "var(--ink)" : "var(--body)",
                  }}
                >
                  {m.label}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.desc}</span>
              </span>
            </button>
          );
        })}
        <div className="sd-notice info" style={{ marginTop: "auto", fontSize: 12.5 }}>
          <Icon name="info" size={16} style={{ flex: "0 0 auto" }} />
          <span>오디오는 이미지·영상과 함께만 추가할 수 있어요.</span>
        </div>
      </aside>

      {/* center — controls */}
      <main className="scroll" style={{ flex: 1, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
        <div className="display-sm">{def.label}</div>

        <div>
          <div className="sd-field-label">프롬프트{!def.needsPrompt && <span className="caption" style={{ fontWeight: 400 }}>· 선택</span>}</div>
          <textarea
            className="sd-textarea"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="장면을 설명하세요. 대사는 큰따옴표로 감싸면 음성으로 반영됩니다."
          />
        </div>

        {/* media zones */}
        {(def.images[1] > 0 || def.videos || def.audio) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {def.images[1] > 0 && (
              <MediaRow
                label={`이미지 ${images.length}/${def.images[1]}`}
                accept="image/*"
                items={images}
                onAdd={() => imgInput.current?.click()}
                onRemove={(i) => setImages((p) => p.filter((_, x) => x !== i))}
                full={images.length >= def.images[1]}
                inputRef={imgInput}
                onPick={(e) => pick(e, "image", setImages, def.images[1])}
              />
            )}
            {def.videos && (
              <MediaRow
                label={`영상 ${videos.length}/3`}
                accept="video/mp4,video/quicktime"
                items={videos}
                onAdd={() => vidInput.current?.click()}
                onRemove={(i) => setVideos((p) => p.filter((_, x) => x !== i))}
                full={videos.length >= 3}
                inputRef={vidInput}
                onPick={(e) => pick(e, "video", setVideos, 3)}
              />
            )}
            {def.audio && (
              <MediaRow
                label={`오디오 ${audios.length}/3`}
                accept="audio/*"
                items={audios}
                onAdd={() => audInput.current?.click()}
                onRemove={(i) => setAudios((p) => p.filter((_, x) => x !== i))}
                full={audios.length >= 3}
                inputRef={audInput}
                onPick={(e) => pick(e, "audio", setAudios, 3)}
              />
            )}
          </div>
        )}

        {/* options — a table bracketed by top & bottom bars; rows keep their
            native 11px vertical padding so content isn't glued to the lines */}
        <div style={{ borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", display: "flex", flexDirection: "column", padding: "4px 0" }}>
          <div className="sd-opt-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <span className="sd-opt-label">해상도</span>
            <PillSet items={RES} value={opts.resolution} onChange={(v) => setOpts({ ...opts, resolution: v })} />
          </div>
          <div className="sd-opt-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <span className="sd-opt-label">화면비</span>
            <PillSet items={RATIO} value={opts.ratio as (typeof RATIO)[number]} onChange={(v) => setOpts({ ...opts, ratio: v })} />
          </div>
          <div className="sd-opt-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <span className="sd-opt-label">길이</span>
            <PillSet items={DUR} value={opts.duration as (typeof DUR)[number]} onChange={(v) => setOpts({ ...opts, duration: v })} render={(v) => `${v}초`} />
          </div>
          <div className="sd-opt-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <span className="sd-opt-label">오디오 생성</span>
            <Toggle on={opts.generate_audio} onClick={() => setOpts({ ...opts, generate_audio: !opts.generate_audio })} />
          </div>
          <div className="sd-opt-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <span className="sd-opt-label">워터마크</span>
            <Toggle on={opts.watermark} onClick={() => setOpts({ ...opts, watermark: !opts.watermark })} />
          </div>
        </div>

        {err && (
          <div className="sd-notice warn">
            <Icon name="warn" size={17} style={{ flex: "0 0 auto" }} />
            <span>{err}</span>
            {!hasApiKey() && (
              <Link to="/settings" style={{ marginLeft: 8, color: "var(--coral)", fontWeight: 600 }}>
                설정으로
              </Link>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, paddingTop: 4 }}>
          <span className="caption" style={{ fontWeight: 400 }}>
            영상 입력 시 1× · 텍스트/이미지만이면 약 1.6× 토큰 차감
          </span>
          <button className="sd-btn sd-btn-primary sd-btn-lg" onClick={submit} disabled={busy}>
            <Icon name="spark" size={16} color="#fff" />
            {busy ? "제출 중…" : "생성하기"}
          </button>
        </div>
      </main>

      {/* right rail — jobs tray */}
      <aside className="scroll" style={{ flex: "0 0 312px", borderLeft: "1px solid var(--hairline)", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="sd-row" style={{ justifyContent: "space-between" }}>
          <div className="label-md">작업</div>
          <Link to="/library" className="caption" style={{ fontWeight: 400, textDecoration: "none" }}>
            전체 보기
          </Link>
        </div>
        {recent.length === 0 && <div className="caption" style={{ fontWeight: 400 }}>아직 작업이 없습니다.</div>}
        {recent.map((t) => (
          <div key={t.id} className="sd-jobcard" style={{ gap: 12, padding: 13 }}>
            <div className="top">
              <div style={{ width: 46, height: 46, borderRadius: "var(--r-sm)", flex: "0 0 auto", overflow: "hidden", background: "var(--surface-soft)", border: "1px solid var(--hairline)" }}>
                {t.videoUrl && <video src={t.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.prompt || t.mode}
                </div>
                <StatusBadge status={t.status} />
              </div>
            </div>
            {t.status === "succeeded" ? (
              t.videoUrl && (
                <a className="sd-btn sd-btn-secondary sd-btn-sm" href={t.videoUrl} download style={{ textDecoration: "none" }}>
                  <Icon name="download" size={14} />
                  저장
                </a>
              )
            ) : t.status === "failed" || t.status === "expired" || t.status === "cancelled" ? (
              <div className="caption" style={{ fontWeight: 400, color: "var(--coral)" }}>{t.error || "실패"}</div>
            ) : (
              <>
                <StepIndicator status={t.status} compact />
                <div className="sd-prog">
                  <span style={{ width: pseudoProgress(t.status) + "%" }} />
                </div>
              </>
            )}
          </div>
        ))}
      </aside>
    </div>
  );
}

function MediaRow({
  label,
  accept,
  items,
  onAdd,
  onRemove,
  full,
  inputRef,
  onPick,
}: {
  label: string;
  accept: string;
  items: UploadedMedia[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  full: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <div className="sd-field-label">{label}</div>
      <div className="sd-thumbs">
        {items.map((m, i) => (
          <div key={m.key} className="sd-thumb">
            {m.kind === "image" ? (
              <img src={m.url} alt="" />
            ) : m.kind === "video" ? (
              <video src={m.url} muted />
            ) : (
              <div className="sd-ph" style={{ width: "100%", height: "100%", border: "none" }}>
                <Icon name="audio" size={18} />
              </div>
            )}
            <button className="x" onClick={() => onRemove(i)} aria-label="remove">
              ×
            </button>
          </div>
        ))}
        {!full && (
          <button className="sd-thumb add" onClick={onAdd} aria-label="add">
            <Icon name="plus" size={18} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple hidden onChange={onPick} />
    </div>
  );
}
