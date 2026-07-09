import { useMemo, useState } from "react";
import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import {
  buildPhase0Drafts,
  getDraftPersonnelLabel,
  getDraftSupportLabel,
  getPhase0SummaryStats,
  type Phase0Draft,
  type Phase0PersonnelType,
  type Phase0Reliability,
  type Phase0SourceExplanation,
  type Phase0SupportNeed,
} from "./phase0-drafts";
import { createPhase0Judgement } from "./phase0-heuristics";
import type { Phase0MessyRecord } from "./phase0-types";

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const safetyBoundary = createPhase0Judgement(selectedRecord);
  const [drafts, setDrafts] = useState<Phase0Draft[]>(() =>
    buildPhase0Drafts(records),
  );
  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.recordId === selectedRecord.id),
    [drafts, selectedRecord.id],
  );

  const { trustedCount, pendingCount, totalMissionCount } = getPhase0SummaryStats(
    drafts,
    records.length,
  );

  function updateDraft(patch: Partial<Phase0Draft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.recordId === selectedRecord.id ? { ...draft, ...patch } : draft,
      ),
    );
  }

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <div className="workbench__intro-top">
          <div>
            <p className="eyebrow">整理工作台</p>
            <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
            <p>
              這裡先只標示安全邊界，真正的候選判斷要由小組和 coding agent
              補上；這不是 runtime LLM 分析，也不是正式資料模型。
            </p>
          </div>

          <div className="workbench__stats" aria-label="整理統計">
            <div className="workbench__stat-card">
              <span className="workbench__stat-label">可信的資訊</span>
              <strong>{trustedCount}</strong>
            </div>
            <div className="workbench__stat-card">
              <span className="workbench__stat-label">待確認</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="workbench__stat-card">
              <span className="workbench__stat-label">總 mission 數量</span>
              <strong>{totalMissionCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          {records.map((record) => (
            <button
              className={record.id === selectedRecord.id ? "active" : ""}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <span>{record.id}</span>
              <StatusBadge status={record.verificationStatus} />
            </button>
          ))}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          <Phase0JudgementCard
            judgement={safetyBoundary}
            record={selectedRecord}
          />

          <section className="draft-editor" aria-label="整理草稿">
            <div className="draft-editor__header">
              <div>
                <p className="eyebrow">人類草稿</p>
                <h3>把這筆資訊整理成可檢視的候選判斷</h3>
              </div>
            </div>

            <div className="draft-editor__row">
              <label className="draft-editor__choice-group">
                <span>是否需要人工確認</span>
                <select
                  value={selectedDraft?.needsHumanReview ? "yes" : "no"}
                  onChange={(event) =>
                    updateDraft({ needsHumanReview: event.target.value === "yes" })
                  }
                >
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </label>

              <label className="draft-editor__choice-group">
                <span>需要的資源</span>
                <select
                  value={selectedDraft?.supportNeed ?? "none"}
                  onChange={(event) =>
                    updateDraft({ supportNeed: event.target.value as Phase0SupportNeed })
                  }
                >
                  {(["people", "power", "resources", "none"] as const).map(
                    (option) => (
                      <option key={option} value={option}>
                        {getDraftSupportLabel(option)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="draft-editor__choice-group">
                <span>人力種類需求</span>
                <select
                  value={selectedDraft?.personnelType ?? "none"}
                  onChange={(event) =>
                    updateDraft({ personnelType: event.target.value as Phase0PersonnelType })
                  }
                >
                  {(["medical", "inspection", "debris", "logistics", "general", "none"] as const).map(
                    (option) => (
                      <option key={option} value={option}>
                        {getDraftPersonnelLabel(option)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="draft-editor__choice-group">
                <span>資源可信度</span>
                <select
                  value={selectedDraft?.reliability ?? "medium"}
                  onChange={(event) =>
                    updateDraft({ reliability: event.target.value as Phase0Reliability })
                  }
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </label>
            </div>

            <div className="draft-editor__field">
              <span>來源說明</span>
              <div className="draft-editor__buttons">
                {(["現場回報", "志工更新", "社群轉錄"] as const).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      className={selectedDraft?.sourceExplanation === option ? "active" : ""}
                      onClick={() =>
                        updateDraft({ sourceExplanation: option as Phase0SourceExplanation })
                      }
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
            </div>

            <label className="draft-editor__field">
              <span>確定的資訊</span>
              <textarea
                rows={3}
                value={selectedDraft?.confirmedInfo ?? ""}
                placeholder="例如：目前已知雨鞋還剩 12 雙、飲用水暫時不缺。"
                onChange={(event) => updateDraft({ confirmedInfo: event.target.value })}
              />
            </label>

            <label className="draft-editor__field">
              <span>不確定的資訊</span>
              <textarea
                rows={3}
                value={selectedDraft?.uncertainInfo ?? ""}
                placeholder="例如：目前還不確定是否需要再派人，或地點是否準確。"
                onChange={(event) => updateDraft({ uncertainInfo: event.target.value })}
              />
            </label>

            <label className="draft-editor__field">
              <span>下一步</span>
              <textarea
                rows={3}
                value={selectedDraft?.nextStep ?? ""}
                placeholder="例如：先確認現場狀況，或先公告給志工。"
                onChange={(event) => updateDraft({ nextStep: event.target.value })}
              />
            </label>
          </section>
        </div>

        <aside className="workbench__checklist">
          <h3>第一階段完成檢查</h3>
          <ul>
            <li>Starter 已載入 {records.length} 筆原始資訊</li>
            <li>請 agent 加上建立、編輯、刪除或重設整理草稿</li>
            <li>至少讓 6 筆原始資訊被嘗試整理成可編輯草稿</li>
            <li>至少挑 2 個候選判斷由人類質疑或修正</li>
            <li>
              把資料品質問題寫進 observations，並記錄 agent 哪裡不能直接相信
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
