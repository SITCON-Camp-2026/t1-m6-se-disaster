import { useMemo, useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import type { Phase0MessyRecord } from "../phase-0/phase0-types";
import {
  createPhase0ActionLens,
  getManualPhase0ActivityStatus,
  phase0ActivityStatusOptions,
  type Phase0ActivityLevel,
  type Phase0Credibility,
} from "../phase-0/phase0-action-lens";

const credibleEnough: Phase0Credibility[] = ["中高", "高"];

function canEnterActionCheck(credibility: Phase0Credibility) {
  return credibleEnough.includes(credibility);
}

export function V1ActionFlowPage({
  records,
}: {
  records: Phase0MessyRecord[];
}) {
  const [selectedRecordId, setSelectedRecordId] = useState(
    records[0]?.id ?? "",
  );
  const [activityLevels, setActivityLevels] = useState<
    Record<string, Phase0ActivityLevel>
  >({});

  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const lens = useMemo(
    () => (selectedRecord ? createPhase0ActionLens(selectedRecord) : null),
    [selectedRecord],
  );

  if (!selectedRecord || !lens) {
    return (
      <main className="layout">
        <section className="panel">
          <p>目前沒有原始資訊可以確認。</p>
        </section>
      </main>
    );
  }

  const manualActivityStatus = activityLevels[selectedRecord.id]
    ? getManualPhase0ActivityStatus(activityLevels[selectedRecord.id])
    : lens.activityStatus;
  const hasEnoughClues = canEnterActionCheck(lens.credibility);

  return (
    <main className="layout v1-page">
      <header className="hero v1-hero">
        <div>
          <p className="eyebrow">v1 / 行動者確認流程</p>
          <h1>去之前先確認</h1>
          <p>
            這一版依照 `docs/flow.md` 做成前端流程。資料仍來自 Phase 0
            原始資訊，所有內容都需要人工確認。
          </p>
        </div>
        <a className="v1-hero__link" href="./">
          回到 Phase 0 首頁
        </a>
      </header>

      <section className="v1-layout" aria-label="v1 行動者確認">
        <aside className="v1-list" aria-label="選擇原始資訊">
          <div className="v1-list__header">
            <h2>原始資訊</h2>
            <span>{records.length} 筆</span>
          </div>
          {records.map((record) => (
            <button
              className={record.id === selectedRecord.id ? "active" : ""}
              key={record.id}
              type="button"
              onClick={() => setSelectedRecordId(record.id)}
            >
              <span>{record.id}</span>
              <StatusBadge status={record.verificationStatus} />
            </button>
          ))}
        </aside>

        <section className="v1-flow" aria-label="行動者確認流程">
          <article className="v1-step">
            <span className="v1-step__number">1</span>
            <div>
              <h2>看內容摘要</h2>
              <p>{lens.summary}</p>
            </div>
          </article>

          <article className="v1-step">
            <span className="v1-step__number">2</span>
            <div>
              <h2>看訊息來源與查核狀態</h2>
              <div className="v1-inline-facts">
                <SourceLabel sourceType={selectedRecord.sourceType} />
                <StatusBadge status={selectedRecord.verificationStatus} />
                <span>更新時間：{selectedRecord.updatedAt}</span>
              </div>
              <p className="v1-note">
                來源只代表資訊怎麼進來，查核狀態仍不能被當成真實承接或正式派工。
              </p>
            </div>
          </article>

          <article className="v1-step v1-step--decision">
            <span className="v1-step__number">3</span>
            <div>
              <h2>能不能直接行動？</h2>
              <p className="v1-decision">
                {hasEnoughClues
                  ? "資訊線索較完整，可以進入下一步狀態判讀。"
                  : "線索不足，先不要直接前往。"}
              </p>
              <div className="action-lens__checks">
                {lens.credibilityReasons.map((reason) => (
                  <span
                    className={
                      reason.startsWith("有")
                        ? "action-lens__check action-lens__check--yes"
                        : "action-lens__check action-lens__check--no"
                    }
                    key={reason}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </article>

          {!hasEnoughClues ? (
            <article className="v1-branch v1-branch--warning">
              <h2>否：需要人工確認，先不要前往</h2>
              <ul>
                {lens.riskReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p>留下判斷紀錄：先確認缺少資訊。</p>
            </article>
          ) : (
            <>
              <article className="v1-step v1-step--status">
                <span className="v1-step__number">4</span>
                <div>
                  <h2>是否可能已有人處理？</h2>
                  <label className="v1-status-select">
                    <span>目前狀態</span>
                    <select
                      aria-label="v1 目前狀態"
                      value={manualActivityStatus.level}
                      onChange={(event) =>
                        setActivityLevels((current) => ({
                          ...current,
                          [selectedRecord.id]: event.target
                            .value as Phase0ActivityLevel,
                        }))
                      }
                    >
                      {phase0ActivityStatusOptions.map((option) => (
                        <option key={option.level} value={option.level}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>{manualActivityStatus.evidence}</p>
                </div>
              </article>

              <article
                className={
                  manualActivityStatus.level === "blocked"
                    ? "v1-branch v1-branch--stop"
                    : "v1-branch"
                }
              >
                <h2>
                  {manualActivityStatus.level === "blocked"
                    ? "是：已有人處理，先不要去"
                    : "否：尚未回報或疑似處理中"}
                </h2>
                <p>{lens.nextStep}</p>
                <p>留下判斷紀錄：確認下一步前，仍要人工查核來源與現場狀態。</p>
              </article>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
