import { labelForSourceType } from "./source-labels";

export function SourceLabel({ sourceType }: { sourceType: string }) {
  return (
    <span className="source-label">來源：{labelForSourceType(sourceType)}</span>
  );
}
