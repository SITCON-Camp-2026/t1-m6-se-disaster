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

type V1Filter = "executable" | "insufficient";

const credibleEnough: Phase0Credibility[] = ["高"];

function canEnterActionCheck(credibility: Phase0Credibility) {
  return credibleEnough.includes(credibility);
}

function createChecklistItems(credibilityReasons: string[]) {
  const missingItems = credibilityReasons
    .filter((reason) => reason.startsWith("缺"))
    .map((reason) => reason.replace("缺：有", "缺："));

  return missingItems.length > 0
    ? missingItems
    : ["五項行動線索都有提到，但仍要人工確認是否已過期或已有人處理。"];
}

function createQuickTags(lens: ReturnType<typeof createPhase0ActionLens>) {
  const tags: string[] = [];

  if (lens.activityStatus.level === "blocked") {
    tags.push("先停");
  }
  if (lens.riskReasons.some((reason) => /模糊地點|位置/.test(reason))) {
    tags.push("地點需確認");
  }
  if (lens.riskReasons.some((reason) => /時間|過期/.test(reason))) {
    tags.push("時間需確認");
  }
  if (lens.riskReasons.some((reason) => /衝突|停止|限制|白跑/.test(reason))) {
    tags.push("重複風險");
  }

  return tags.length > 0 ? tags.slice(0, 2) : ["待人工確認"];
}

function createActionConclusion({
  hasEnoughClues,
  statusLevel,
}: {
  hasEnoughClues: boolean;
  statusLevel: Phase0ActivityLevel;
}) {
  if (!hasEnoughClues) {
    return {
      tone: "wait",
      title: "目前不適合前往",
      body: "這筆原始資訊不足以判斷要不要去；請先補齊缺少的地點、時間、規格或人員資訊。",
    };
  }

  if (statusLevel === "blocked") {
    return {
      tone: "stop",
      title: "先不要去，避免重複或白跑",
      body: "原文出現停止、限制或可能已有人處理的訊號。請先確認限制原因與承接狀態。",
    };
  }

  if (statusLevel === "active") {
    return {
      tone: "check",
      title: "先確認是否正在處理",
      body: "資訊足以進入行動判斷，但仍要先確認現場是否已有人前往或正在更新狀態。",
    };
  }

  return {
    tone: "check",
    title: "可做下一步判斷，但不要直接出發",
    body: "原文線索較完整，可以用來判斷下一步；仍需先確認是否已有人承接與現場狀態。",
  };
}

export function V1ActionFlowPage({
  records,
}: {
  records: Phase0MessyRecord[];
}) {
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
      </header>

      <V1ActionFlowPanel records={records} />
    </main>
  );
}

export function V1ActionFlowPanel({
  records,
}: {
  records: Phase0MessyRecord[];
}) {
  const [activeFilter, setActiveFilter] = useState<V1Filter>("executable");
  const [selectedRecordId, setSelectedRecordId] = useState(
    records[0]?.id ?? "",
  );
  const [activityLevels, setActivityLevels] = useState<
    Record<string, Phase0ActivityLevel>
  >({});
  const [supplementNotes, setSupplementNotes] = useState<
    Record<string, string>
  >({});

  const recordItems = useMemo(
    () =>
      records.map((record) => ({
        lens: createPhase0ActionLens(record),
        record,
      })),
    [records],
  );
  const executableCount = recordItems.filter(
    (item) => item.lens.credibility === "高",
  ).length;
  const insufficientCount = recordItems.length - executableCount;
  const visibleItems = recordItems.filter((item) =>
    activeFilter === "executable"
      ? item.lens.credibility === "高"
      : item.lens.credibility !== "高",
  );
  const selectedItem =
    visibleItems.find((item) => item.record.id === selectedRecordId) ??
    visibleItems[0] ??
    recordItems[0];
  const selectedRecord = selectedItem?.record;
  const lens = selectedItem?.lens;

  if (!selectedRecord || !lens) {
    return (
      <section className="panel">
        <p>目前沒有原始資訊可以確認。</p>
      </section>
    );
  }

  const manualActivityStatus = activityLevels[selectedRecord.id]
    ? getManualPhase0ActivityStatus(activityLevels[selectedRecord.id])
    : lens.activityStatus;
  const hasEnoughClues = canEnterActionCheck(lens.credibility);
  const actionConclusion = createActionConclusion({
    hasEnoughClues,
    statusLevel: manualActivityStatus.level,
  });
  const missingChecklist = createChecklistItems(lens.credibilityReasons);
  const isExecutableRecord = lens.credibility === "高";

  return (
    <section className="v1-workspace">
      <div className="v1-workspace__header">
        <div>
          <h2>行動者判讀</h2>
          <p>
            先分出可行動判斷度高的資料；不足的資料先補時間、地點、數量或現場狀態。
          </p>
        </div>
        <div className="v1-hero__actions" aria-label="資料分類">
          <div className="v1-filter-buttons">
            <button
              className={activeFilter === "executable" ? "active" : ""}
              type="button"
              onClick={() => setActiveFilter("executable")}
            >
              可執行區
              <strong>{executableCount}</strong>
            </button>
            <button
              className={activeFilter === "insufficient" ? "active" : ""}
              type="button"
              onClick={() => setActiveFilter("insufficient")}
            >
              資料不足區
              <strong>{insufficientCount}</strong>
            </button>
          </div>
        </div>
      </div>

      <section className="v1-layout" aria-label="v1 行動者確認">
        <aside className="v1-list" aria-label="選擇原始資訊">
          <div className="v1-list__header">
            <h2>原始資訊</h2>
            <span>{visibleItems.length} 筆</span>
          </div>
          {visibleItems.map(({ lens: itemLens, record }) => (
            <RecordPickerButton
              isActive={record.id === selectedRecord.id}
              key={record.id}
              lens={itemLens}
              onSelect={() => setSelectedRecordId(record.id)}
              record={record}
            />
          ))}
        </aside>

        <section className="v1-flow" aria-label="行動者確認流程">
          <article
            className={`v1-action-summary v1-action-summary--${actionConclusion.tone}`}
          >
            <div>
              <p className="eyebrow">最重要判斷</p>
              <h2>{actionConclusion.title}</h2>
              <p>{actionConclusion.body}</p>
            </div>
            <div className="v1-readiness">
              <span>可行動判斷度</span>
              <strong>{lens.credibility}</strong>
              <p>代表是否足夠判斷要不要去，不代表已查核。</p>
            </div>
          </article>

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
              <h2>可行動判斷說明</h2>
              <p className="v1-decision">
                {hasEnoughClues
                  ? "線索較多，但仍不能直接前往；請先判斷是否可能已有人處理。"
                  : "線索不足，不能用來決定前往；請先補確認。"}
              </p>
              <p className="v1-note">
                判斷度來自原文是否交代需求、規格、地點、時間與需要的人；它只協助判斷下一步，不代表已查核。
              </p>
            </div>
          </article>

          {!hasEnoughClues ? (
            <article className="v1-branch v1-branch--warning v1-next-step">
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
                  <p className="v1-note">
                    這只是本機判讀，不會通知任何人，也不是正式派工或承接狀態。
                  </p>
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
                    ? "v1-branch v1-branch--stop v1-next-step"
                    : "v1-branch v1-next-step"
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

        <aside className="v1-side-panel" aria-label="行動者補確認資訊">
          <section>
            <h2>需要補確認</h2>
            <ul>
              {missingChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>可能需要的人</h2>
            <div className="v1-chip-list">
              {lens.neededPeople.map((personType) => (
                <span key={personType}>{personType}</span>
              ))}
            </div>
          </section>

          {!isExecutableRecord ? (
            <section>
              <h2>補充資訊</h2>
              <label className="v1-supplement">
                <span>
                  如果知道新的時間、地點、數量或現場狀態，可以先記在這裡。
                </span>
                <textarea
                  aria-label="補充資訊"
                  placeholder="例：新的盤點時間、比較明確的集合點、已有人回報處理..."
                  value={supplementNotes[selectedRecord.id] ?? ""}
                  onChange={(event) =>
                    setSupplementNotes((current) => ({
                      ...current,
                      [selectedRecord.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <p className="v1-note">這只是本機草稿，不會同步或送出。</p>
            </section>
          ) : null}
        </aside>
      </section>
    </section>
  );
}

function RecordPickerButton({
  isActive,
  lens,
  onSelect,
  record,
}: {
  isActive: boolean;
  lens: ReturnType<typeof createPhase0ActionLens>;
  onSelect: () => void;
  record: Phase0MessyRecord;
}) {
  const tags = createQuickTags(lens);

  return (
    <button
      className={isActive ? "active" : ""}
      type="button"
      onClick={onSelect}
    >
      <span className="v1-list__record-title">
        <strong>{record.id}</strong>
        <span>判斷度：{lens.credibility}</span>
      </span>
      <span className="v1-list__summary">{record.rawText}</span>
      <span className="v1-list__meta">
        <StatusBadge status={record.verificationStatus} />
        {tags.map((tag) => (
          <span className="v1-mini-tag" key={tag}>
            {tag}
          </span>
        ))}
      </span>
    </button>
  );
}
