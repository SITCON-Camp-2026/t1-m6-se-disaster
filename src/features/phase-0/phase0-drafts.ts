export type Phase0SupportNeed = "people" | "power" | "resources" | "none";
export type Phase0ResourceDetailType =
  | "medical"
  | "inspection"
  | "debris"
  | "logistics"
  | "general"
  | "water"
  | "boots"
  | "medicine"
  | "food"
  | "electricity"
  | "none";
export type Phase0Reliability = "high" | "medium" | "low";
export type Phase0SourceExplanation =
  | "現場回報"
  | "志工更新"
  | "社群轉錄"
  | "電話";

export type Phase0Draft = {
  recordId: string;
  needsHumanReview: boolean;
  needsAnnouncement: boolean;
  supportNeed: Phase0SupportNeed;
  resourceDetailType: Phase0ResourceDetailType;
  reliability: Phase0Reliability;
  sourceExplanation: Phase0SourceExplanation;
  confirmedInfo: string;
  uncertainInfo: string;
  nextStep: string;
};

export function getDraftSupportLabel(supportNeed: Phase0SupportNeed) {
  switch (supportNeed) {
    case "people":
      return "人力";
    case "power":
      return "水電";
    case "resources":
      return "物資";
    case "none":
      return "無";
  }
}

export function getDraftDetailLabel(resourceDetailType: Phase0ResourceDetailType) {
  switch (resourceDetailType) {
    case "medical":
      return "醫療人員";
    case "inspection":
      return "查核人員";
    case "debris":
      return "清泥人員";
    case "logistics":
      return "後勤人員";
    case "general":
      return "一般志工";
    case "water":
      return "飲水";
    case "boots":
      return "雨鞋";
    case "medicine":
      return "藥物";
    case "food":
      return "食物";
    case "electricity":
      return "電力";
    case "none":
      return "無";
  }
}

export function getDraftDetailOptions(supportNeed: Phase0SupportNeed) {
  switch (supportNeed) {
    case "people":
      return (["inspection", "medical", "debris", "logistics", "general"] as const);
    case "power":
      return (["electricity"] as const);
    case "resources":
      return (["water", "boots", "medicine", "food"] as const);
    case "none":
      return (["none"] as const);
  }
}

export function buildPhase0Drafts(
  records: Array<{ id: string; sourceType: string; updatedAt: string }>,
): Phase0Draft[] {
  return records.map((record, index) => ({
    recordId: record.id,
    needsHumanReview: index % 2 === 0,
    needsAnnouncement: index === 5,
    supportNeed: (["people", "resources", "power", "none"] as const)[index % 4],
    resourceDetailType: (["inspection", "medical", "debris", "general", "water", "boots", "medicine", "food", "electricity", "none"] as const)[index % 10],
    reliability: (["low", "medium", "high"] as const)[index % 3],
    sourceExplanation: (["現場回報", "志工更新", "社群轉錄"] as const)[index % 3],
    confirmedInfo: "請寫出這筆資訊中已知且較確定的內容。",
    uncertainInfo: "請寫出這筆資訊中仍不確定、需要確認的內容。",
    nextStep: "請填入下一步建議。",
  }));
}

export function getPhase0SummaryStats(drafts: Phase0Draft[], totalMissionCount: number) {
  const trustedCount = drafts.filter((draft) => draft.reliability === "high").length;
  const pendingCount = Math.max(0, totalMissionCount - trustedCount);

  return {
    trustedCount,
    pendingCount,
    totalMissionCount,
  };
}
