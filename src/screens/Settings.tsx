import { useState } from "react";
import { Icon } from "../components/Icon";
import { PillSet, Toggle } from "../components/ui";
import { getApiKey, getPreset, setApiKey, setPreset } from "../lib/store";
import type { GenOptions } from "../lib/types";
import { useTasksCtx } from "../App";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

const RES = ["480p", "720p", "1080p"] as const;
const RATIO = ["16:9", "9:16", "1:1", "4:3"] as const;
const DUR = [4, 6, 10, 15] as const;

export default function Settings() {
  const { tasks } = useTasksCtx();
  const consumed = tasks.reduce((sum, t) => sum + (t.usageTokens || 0), 0);
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(!!getApiKey());
  const [preset, setLocalPreset] = useState<GenOptions>(getPreset());

  function saveKey() {
    setApiKey(key.trim());
    setSaved(!!key.trim());
  }
  function updatePreset(p: GenOptions) {
    setLocalPreset(p);
    setPreset(p);
  }

  return (
    <div className="app-body" style={{ flexDirection: "column" }}>
      <div className="scroll" style={{ flex: 1, padding: 40, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 34 }}>
          <div className="display-md">설정</div>

          {/* API key */}
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="sd-row" style={{ gap: 10 }}>
                <div className="title-md">인증 키 (BYOK)</div>
                <span className={"sd-badge " + (saved ? "succeeded" : "failed")}>
                  <span className="bd" />
                  {saved ? "등록됨" : "미등록"}
                </span>
              </div>
              <div className="body muted" style={{ marginTop: 4 }}>
                BytePlus ModelArk에서 발급받은 본인 API 키를 등록하면 영상 생성이 활성화됩니다.
              </div>
            </div>
            {!saved && (
              <div className="sd-notice warn">
                <Icon name="warn" size={17} style={{ flex: "0 0 auto" }} />
                <span>아직 키가 등록되지 않았습니다. 키를 등록해야 영상을 생성할 수 있어요.</span>
              </div>
            )}
            <div className="sd-card" style={{ padding: 20 }}>
              <div className="sd-field-label">
                <Icon name="key" size={15} />
                API 키
              </div>
              <div className="sd-row" style={{ gap: 10 }}>
                <input
                  className="sd-input mono"
                  type="password"
                  placeholder="bp-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <button className="sd-btn sd-btn-primary" onClick={saveKey} style={{ flex: "0 0 auto" }}>
                  {saved ? "변경" : "등록"}
                </button>
              </div>
              <div className="sd-field-hint">
                키는 이 브라우저에만 저장됩니다. 생성 요청 시에만 서버를 거쳐 BytePlus로 전달되며, 서버에 보관되지 않습니다.
              </div>
            </div>
          </section>

          {/* preset */}
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="title-md">기본 옵션 프리셋</div>
              <div className="body muted" style={{ marginTop: 4 }}>새 작업을 시작할 때 자동으로 채워질 기본값입니다.</div>
            </div>
            <div className="sd-card" style={{ padding: "8px 20px" }}>
              <div className="sd-opt-row">
                <span className="sd-opt-label">해상도</span>
                <PillSet items={RES} value={preset.resolution} onChange={(v) => updatePreset({ ...preset, resolution: v })} />
              </div>
              <div className="sd-opt-row">
                <span className="sd-opt-label">화면비</span>
                <PillSet items={RATIO} value={preset.ratio as (typeof RATIO)[number]} onChange={(v) => updatePreset({ ...preset, ratio: v })} />
              </div>
              <div className="sd-opt-row">
                <span className="sd-opt-label">길이</span>
                <PillSet items={DUR} value={preset.duration as (typeof DUR)[number]} onChange={(v) => updatePreset({ ...preset, duration: v })} render={(v) => `${v}초`} />
              </div>
              <div className="sd-opt-row">
                <span className="sd-opt-label">오디오 생성</span>
                <Toggle on={preset.generate_audio} onClick={() => updatePreset({ ...preset, generate_audio: !preset.generate_audio })} />
              </div>
            </div>
          </section>

          {/* usage — consumed only; remaining balance is not exposed via the API */}
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="title-md">사용량</div>
            <div className="sd-sig cream" style={{ padding: 24 }}>
              <div className="caption" style={{ color: "#7a6a4a" }}>이 앱에서 소비한 누적 토큰</div>
              <div style={{ fontSize: 34, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", marginTop: 2 }}>
                {formatTokens(consumed)}
              </div>
              <div className="body" style={{ color: "#5a4a2e", marginTop: 10 }}>
                완료된 작업의 실제 소비량 합계입니다. 리소스 팩 잔여량은 BytePlus 콘솔의 Billing center → Resource package에서 확인하세요.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
