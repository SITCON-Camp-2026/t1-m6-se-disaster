import { useMemo, useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import type { Phase0MessyRecord } from "../phase-0/phase0-types";
import {
  createPhase0ActionLens,
  getManualPhase0ActivityStatus,
  phase0ActivityStatusOptions,
  type Phase0ActivityLevel,
} from "../phase-0/phase0-action-lens";

type TaskCategoryId =
  "medical" | "mud" | "electrician" | "logistics" | "fieldCheck";

type TaskItem = {
  categories: TaskCategoryId[];
  lens: ReturnType<typeof createPhase0ActionLens>;
  record: Phase0MessyRecord;
};

const taskCategories: Array<{ id: TaskCategoryId; label: string }> = [
  { id: "medical", label: "醫療" },
  { id: "mud", label: "清泥人員" },
  { id: "electrician", label: "水電工" },
  { id: "logistics", label: "物資盤點或後勤人員" },
  { id: "fieldCheck", label: "現場查核人員" },
];

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function getTaskCategories(record: Phase0MessyRecord): TaskCategoryId[] {
  const text = record.rawText;
  const categories: TaskCategoryId[] = [];

  if (hasAny(text, [/藥品|醫療|長者|親友|家屬/])) {
    categories.push("medical");
  }
  if (hasAny(text, [/清泥|清淤/])) {
    categories.push("mud");
  }
  if (hasAny(text, [/水電|檢修|停電|電力|工班/])) {
    categories.push("electrician");
  }
  if (hasAny(text, [/雨鞋|飲用水|衣物|鏟子|物資|盤點|收|送/])) {
    categories.push("logistics");
  }
  if (
    hasAny(text, [
      /地址|位置|地點|集合點|道路|封閉|入口|公告|服務台|現場|回報|確認|站|中心|老街口|A 區/,
    ])
  ) {
    categories.push("fieldCheck");
  }

  return categories.length > 0 ? categories : ["fieldCheck"];
}

function createKnownDetails(record: Phase0MessyRecord) {
  const text = record.rawText;
  const details: string[] = [];
  const locationMatches = [
    "光復車站東側出口",
    "光復車站",
    "溪畔活動中心",
    "大進路口服務台",
    "大進路口",
    "站前遮雨棚",
    "學校側門",
    "老街口",
    "A 區",
  ].filter((place) => text.includes(place));
  const timeMatches = [
    ...text.matchAll(/\d{1,2}:\d{2}/g),
    ...text.matchAll(/中午前|下午|早上|下一次現場盤點預計/g),
  ].map((match) => match[0]);
  const quantityMatches = [
    ...text.matchAll(/\d+\s*雙/g),
    ...text.matchAll(/十幾個人|約剩\s*\d+\s*雙|尺寸多為\s*\d+-\d+/g),
  ].map((match) => match[0]);

  if (locationMatches.length > 0) {
    details.push(`地點：${[...new Set(locationMatches)].join("、")}`);
  }
  if (timeMatches.length > 0) {
    details.push(`時間：${[...new Set(timeMatches)].join("、")}`);
  }
  if (quantityMatches.length > 0) {
    details.push(`數量或規格：${[...new Set(quantityMatches)].join("、")}`);
  }

  return details;
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
  const [activeCategory, setActiveCategory] = useState<TaskCategoryId>("mud");
  const [activityLevels, setActivityLevels] = useState<
    Record<string, Phase0ActivityLevel>
  >({});
  const [acceptedRecordId, setAcceptedRecordId] = useState<string | null>(null);
  const [completedRecordIds, setCompletedRecordIds] = useState<
    Record<string, boolean>
  >({});

  const recordItems = useMemo(
    () =>
      records.map((record) => ({
        categories: getTaskCategories(record),
        lens: createPhase0ActionLens(record),
        record,
      })),
    [records],
  );
  const visibleItems = recordItems.filter((item) =>
    item.categories.includes(activeCategory),
  );

  if (recordItems.length === 0) {
    return (
      <section className="panel">
        <p>目前沒有原始資訊可以確認。</p>
      </section>
    );
  }

  return (
    <section className="v1-workspace">
      <div className="v1-workspace__header">
        <div>
          <h2>查看任務</h2>
          <p>
            依需要的人力資源分組。每筆任務仍是原始資訊判讀，不代表正式派工。
          </p>
        </div>
        <div className="v1-task-note">
          接案和回報只存在本機，不會通知任何人。
        </div>
      </div>

      <nav className="v1-category-tabs" aria-label="依人力資源篩選任務">
        {taskCategories.map((category) => {
          const count = recordItems.filter((item) =>
            item.categories.includes(category.id),
          ).length;

          return (
            <button
              className={activeCategory === category.id ? "active" : ""}
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{category.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </nav>

      <section className="v1-task-grid" aria-label="查看任務">
        {visibleItems.map((item) => (
          <TaskCard
            activityStatusLevel={activityLevels[item.record.id]}
            acceptedRecordId={acceptedRecordId}
            completed={Boolean(completedRecordIds[item.record.id])}
            item={item}
            key={item.record.id}
            onAccept={() => {
              setAcceptedRecordId(item.record.id);
              setActivityLevels((current) => ({
                ...current,
                [item.record.id]: "blocked",
              }));
            }}
            onActivityStatusChange={(level) =>
              setActivityLevels((current) => ({
                ...current,
                [item.record.id]: level,
              }))
            }
            onComplete={() =>
              setCompletedRecordIds((current) => ({
                ...current,
                [item.record.id]: true,
              }))
            }
          />
        ))}
      </section>
    </section>
  );
}

function TaskCard({
  acceptedRecordId,
  activityStatusLevel,
  completed,
  item,
  onAccept,
  onActivityStatusChange,
  onComplete,
}: {
  acceptedRecordId: string | null;
  activityStatusLevel?: Phase0ActivityLevel;
  completed: boolean;
  item: TaskItem;
  onAccept: () => void;
  onActivityStatusChange: (level: Phase0ActivityLevel) => void;
  onComplete: () => void;
}) {
  const { lens, record } = item;
  const activityStatus = activityStatusLevel
    ? getManualPhase0ActivityStatus(activityStatusLevel)
    : lens.activityStatus;
  const tags = createQuickTags(lens);
  const knownDetails = createKnownDetails(record);
  const accepted = acceptedRecordId === record.id;
  const cannotAccept = activityStatus.level === "blocked" || completed;

  return (
    <article
      className={completed ? "v1-task-card v1-task-card--done" : "v1-task-card"}
    >
      <header className="v1-task-card__header">
        <div>
          <p className="eyebrow">{record.id}</p>
          <h3>{completed ? "已回報處理" : activityStatus.label}</h3>
        </div>
        <span className="v1-readiness-pill">判斷度：{lens.credibility}</span>
      </header>

      <p className="v1-task-card__content">{record.rawText}</p>

      <div className="v1-task-card__meta">
        <SourceLabel sourceType={record.sourceType} />
        <StatusBadge status={record.verificationStatus} />
        {tags.map((tag) => (
          <span className="v1-mini-tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <label className="v1-status-select">
        <span>狀態</span>
        <select
          aria-label={`${record.id} 狀態`}
          value={activityStatus.level}
          onChange={(event) =>
            onActivityStatusChange(event.target.value as Phase0ActivityLevel)
          }
        >
          {phase0ActivityStatusOptions.map((option) => (
            <option key={option.level} value={option.level}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="v1-task-card__actions">
        <button disabled={cannotAccept} type="button" onClick={onAccept}>
          接案
        </button>
        {activityStatus.level === "blocked" ? (
          <small>已經有人去處理囉～</small>
        ) : null}
      </div>

      {accepted ? (
        <section
          className="v1-accept-panel"
          aria-label={`${record.id} 接案資訊`}
        >
          <h4>接案資訊</h4>
          {knownDetails.length > 0 ? (
            <ul>
              {knownDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : (
            <p>目前原文沒有可直接列出的地點、時間或數量。</p>
          )}
          <p>{lens.nextStep}</p>
          <button disabled={completed} type="button" onClick={onComplete}>
            回報已處理
          </button>
        </section>
      ) : null}
    </article>
  );
}
