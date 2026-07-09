import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0ActionLensCard } from "./Phase0ActionLensCard";
import type { Phase0ActivityLevel } from "./phase0-action-lens";
import type { Phase0MessyRecord } from "./phase0-types";

export function Phase0ActionLensPanel({
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
  const [activityLevels, setActivityLevels] = useState<
    Record<string, Phase0ActivityLevel>
  >({});

  function updateActivityLevel(recordId: string, level: Phase0ActivityLevel) {
    setActivityLevels((current) => ({ ...current, [recordId]: level }));
  }

  return (
    <div className="action-lens-panel">
      <div className="panel__header">
        <div>
          <h2>行動者判讀</h2>
          <p>
            這裡只協助判讀原文完整度與行動風險，不代表已查核，也不代表可以直接派工。
          </p>
        </div>
        <p>{records.length} 筆資料</p>
      </div>

      <div className="action-lens-panel__layout">
        <aside className="workbench__queue" aria-label="選擇行動者判讀資料">
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

        <div className="action-lens-panel__main">
          <Phase0ActionLensCard
            activityStatusLevel={activityLevels[selectedRecord.id]}
            onActivityStatusChange={(level) =>
              updateActivityLevel(selectedRecord.id, level)
            }
            record={selectedRecord}
          />
        </div>
      </div>
    </div>
  );
}
