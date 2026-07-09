import { labelForSourceType } from "../../components/source-labels";
import type { Phase0MessyRecord } from "./phase0-types";
import {
  createPhase0ActionLens,
  getManualPhase0ActivityStatus,
  phase0ActivityStatusOptions,
  type Phase0ActivityLevel,
} from "./phase0-action-lens";

const credibilityClassName = {
  低: "action-lens__credibility action-lens__credibility--low",
  中低: "action-lens__credibility action-lens__credibility--medium-low",
  中: "action-lens__credibility action-lens__credibility--medium",
  中高: "action-lens__credibility action-lens__credibility--medium-high",
  高: "action-lens__credibility action-lens__credibility--high",
} as const;

export function Phase0ActionLensCard({
  activityStatusLevel,
  onActivityStatusChange,
  record,
}: {
  activityStatusLevel?: Phase0ActivityLevel;
  onActivityStatusChange?: (level: Phase0ActivityLevel) => void;
  record: Phase0MessyRecord;
}) {
  const lens = createPhase0ActionLens(record);
  const activityStatus = activityStatusLevel
    ? getManualPhase0ActivityStatus(activityStatusLevel)
    : lens.activityStatus;
  const sourceLabel = labelForSourceType(record.sourceType);

  return (
    <article className="action-lens" aria-label="行動者判讀">
      <div className="action-lens__header">
        <div>
          <p className="eyebrow">行動者判讀</p>
          <h3>去之前先看這裡，避免把未確認資訊變成白工</h3>
        </div>
        <span className={credibilityClassName[lens.credibility]}>
          可信度：{lens.credibility}
        </span>
      </div>

      <div className="action-lens__section">
        <h4>內容摘要</h4>
        <p>{lens.summary}</p>
      </div>

      <section className="action-lens__quick-facts" aria-label="行動資訊摘要">
        <div className="action-lens__quick-fact">
          <span className="action-lens__quick-fact-label">
            需要的人員種類：
          </span>
          <div className="action-lens__chips">
            {lens.neededPeople.map((personType) => (
              <span key={personType}>{personType}</span>
            ))}
          </div>
        </div>

        <div className="action-lens__quick-fact action-lens__quick-fact--status">
          <label className="action-lens__activity-select">
            <span>目前狀態：</span>
            <select
              aria-label="目前狀態"
              value={activityStatus.level}
              onChange={(event) =>
                onActivityStatusChange?.(
                  event.target.value as Phase0ActivityLevel,
                )
              }
            >
              {phase0ActivityStatusOptions.map((option) => (
                <option key={option.level} value={option.level}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="action-lens__quick-fact">
          <span className="action-lens__quick-fact-label">訊息來源：</span>
          <strong>{sourceLabel}</strong>
        </div>
      </section>

      <section className="action-lens__section">
        <h4>目前風險與可信度原因</h4>
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
        <ul>
          {lens.riskReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className="action-lens__next-step">
        <h4>下一步建議</h4>
        <p>{lens.nextStep}</p>
      </section>
    </article>
  );
}
