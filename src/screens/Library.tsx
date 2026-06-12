import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { StatusBadge } from "../components/ui";
import type { TaskStatus } from "../lib/types";
import { useTasksCtx } from "../App";

const FILTERS: Array<{ id: "all" | TaskStatus; label: string }> = [
  { id: "all", label: "전체" },
  { id: "queued", label: "대기중" },
  { id: "running", label: "생성중" },
  { id: "succeeded", label: "완료" },
  { id: "failed", label: "실패" },
];

function timeAgo(unix: number) {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export default function Library() {
  const { tasks, remove } = useTasksCtx();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [q, setQ] = useState("");

  const shown = tasks.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (q && !(t.prompt || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="app-body" style={{ flexDirection: "column" }}>
      <div className="scroll" style={{ flex: 1, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="sd-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="display-md">보관함</div>
            <div className="body muted" style={{ marginTop: 6 }}>
              완성한 영상은 안전하게 보관됩니다 (원본은 24시간 뒤 만료되지만 자동 저장됩니다).
            </div>
          </div>
          <div className="sd-search">
            <Icon name="search" size={15} />
            <input placeholder="프롬프트로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="sd-filters">
          {FILTERS.map((f) => (
            <button key={f.id} className={"sd-filter" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="sd-sig cream" style={{ width: "100%", maxWidth: 720, padding: "52px 56px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
              <div className="display-sm">아직 만든 영상이 없어요</div>
              <div className="body" style={{ maxWidth: 420, color: "#5a4a2e" }}>
                장면을 설명하는 문장 하나면 충분합니다. 첫 영상을 만들어 보관함을 채워 보세요.
              </div>
              <Link to="/" className="sd-btn sd-btn-primary" style={{ marginTop: 22, textDecoration: "none" }}>
                <Icon name="plus" size={16} color="#fff" />
                첫 영상 만들기
              </Link>
            </div>
          </div>
        ) : (
          <div className="sd-libgrid">
            {shown.map((t) => (
              <div key={t.id} className="sd-libcard">
                <div className="media">
                  {t.videoUrl ? (
                    <video src={t.videoUrl} controls preload="metadata" />
                  ) : (
                    <div className="sd-ph" style={{ width: "100%", height: "100%", border: "none" }}>
                      <span className="lbl">{t.status}</span>
                    </div>
                  )}
                </div>
                <div className="meta">
                  <div className="sd-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <StatusBadge status={t.status} />
                    <span className="caption" style={{ fontWeight: 400 }}>{timeAgo(t.createdAt)}</span>
                  </div>
                  <div className="body" style={{ color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 38 }}>
                    {t.prompt || t.mode}
                  </div>
                  {t.error && <div className="caption" style={{ fontWeight: 400, color: "var(--coral)", marginTop: 6 }}>{t.error}</div>}
                  <div className="sd-row" style={{ gap: 8, marginTop: 12 }}>
                    {t.videoUrl ? (
                      <a className="sd-btn sd-btn-secondary sd-btn-sm" href={t.videoUrl} download style={{ flex: 1, textDecoration: "none" }}>
                        <Icon name="download" size={14} />
                        저장
                      </a>
                    ) : (
                      <button className="sd-btn sd-btn-secondary sd-btn-sm" disabled style={{ flex: 1 }}>
                        <Icon name="download" size={14} />
                        저장
                      </button>
                    )}
                    <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => remove(t.id)} style={{ color: "var(--coral)", marginLeft: "auto" }} aria-label="삭제">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
