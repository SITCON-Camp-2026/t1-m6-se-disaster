const sourceLabels: Record<string, string> = {
  field_report: "現場回報",
  phone_call: "電話",
  social_post: "社群轉錄",
  official_notice: "官方公告",
  volunteer_update: "志工更新",
  mock: "模擬資料",
};

export function labelForSourceType(sourceType: string) {
  return sourceLabels[sourceType] ?? sourceType;
}
