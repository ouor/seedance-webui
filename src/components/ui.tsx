import { NavLink } from "react-router-dom";
import { Icon } from "./Icon";
import { useTasksCtx } from "../App";
import type { TaskStatus } from "../lib/types";

// Tokens consumed *through this app* — derived from the usage we already store
// per task. We deliberately do NOT show a remaining balance: ModelArk has no
// balance-query API for BYOK keys, so any "remaining" figure would be a guess.
function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

export function TopNav() {
  const { tasks } = useTasksCtx();
  const consumed = tasks.reduce((sum, t) => sum + (t.usageTokens || 0), 0);
  const link = ({ isActive }: { isActive: boolean }) =>
    "sd-navlink" + (isActive ? " active" : "");
  return (
    <nav className="sd-nav">
      <NavLink to="/" className="sd-brand">
        <span className="mark" />
        Seedance
      </NavLink>
      <div className="sd-navlinks">
        <NavLink to="/" end className={link}>
          생성
        </NavLink>
        <NavLink to="/library" className={link}>
          보관함
        </NavLink>
        <NavLink to="/settings" className={link}>
          설정
        </NavLink>
      </div>
      <div className="sd-nav-right">
        <NavLink to="/library" className="sd-usage" title="이 앱에서 소비한 누적 토큰">
          <Icon name="spark" size={14} color="var(--coral)" />
          소비 토큰 <b>{formatTokens(consumed)}</b>
        </NavLink>
      </div>
    </nav>
  );
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: "대기중",
  running: "생성중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
  expired: "만료",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={"sd-badge " + status}>
      <span className="bd" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StepIndicator({ status, compact }: { status: TaskStatus; compact?: boolean }) {
  const order = ["queued", "running", "succeeded"] as const;
  const names = { queued: "대기", running: "생성중", succeeded: "완료" };
  // map terminal-but-failed onto the running position visually
  const idx = status === "succeeded" ? 2 : status === "running" ? 1 : 0;
  return (
    <div className="sd-steps">
      {order.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? (s === "succeeded" ? "done" : "active") : "";
        return (
          <div key={s} style={{ display: "contents" }}>
            <div className={"sd-step " + state}>
              <span className="dot">
                {state === "done" ? <Icon name="check" size={13} sw={2.2} /> : i + 1}
              </span>
              {!compact && <span className="nm">{names[s]}</span>}
            </div>
            {i < order.length - 1 && <span className={"sd-step-line" + (i < idx ? " fill" : "")} />}
          </div>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={"sd-toggle" + (on ? " on" : "")}
      onClick={onClick}
      aria-pressed={on}
      aria-label="toggle"
    />
  );
}

export function PillSet<T extends string | number>({
  items,
  value,
  onChange,
  render,
}: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <div className="sd-pillset">
      {items.map((it) => (
        <button
          key={String(it)}
          type="button"
          className={"sd-pill" + (it === value ? " active" : "")}
          onClick={() => onChange(it)}
        >
          {render ? render(it) : String(it)}
        </button>
      ))}
    </div>
  );
}
