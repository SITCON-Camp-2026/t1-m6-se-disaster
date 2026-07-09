import { labelForSourceType } from "../../components/source-labels";
import type { Phase0MessyRecord } from "./phase0-types";

export type Phase0ActionLens = {
  summary: string;
  neededPeople: string[];
  activityStatus: Phase0ActivityStatus;
  credibility: Phase0Credibility;
  credibilityReasons: string[];
  riskReasons: string[];
  nextStep: string;
};

export type Phase0Credibility = "低" | "中低" | "中" | "中高" | "高";
export type Phase0ActivityLevel = "reported" | "active" | "blocked";

export type Phase0ActivityStatus = {
  level: Phase0ActivityLevel;
  label: string;
  evidence: string;
};

export const phase0ActivityStatusOptions: Phase0ActivityStatus[] = [
  {
    level: "reported",
    label: "尚未有人回報處理",
    evidence: "目前尚未有明確承接紀錄。",
  },
  {
    level: "active",
    label: "疑似有人處理中",
    evidence: "有人可能正在前往、處理或更新現場狀態。",
  },
  {
    level: "blocked",
    label: "已有人處理，先不要去",
    evidence: "已標示為有人處理或現場有停止、限制訊息。",
  },
];

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function getCredibilityByScore(score: number): Phase0Credibility {
  switch (score) {
    case 5:
      return "高";
    case 4:
      return "中高";
    case 3:
      return "中";
    case 2:
      return "中低";
    default:
      return "低";
  }
}

function hasClearLocation(text: string) {
  if (/地址只有|位置.*無法確認|尚未確認.*完整地址/.test(text)) {
    return false;
  }

  return hasAny(text, [
    /溪畔活動中心|光復車站東側出口|大進路口服務台|站前遮雨棚|學校側門|老街口|A 區|集合點|服務台/,
  ]);
}

function createCredibilitySignals(text: string) {
  const signals = [
    {
      label: "有提到需求或缺什麼物資",
      matched: hasAny(text, [
        /需要|缺|不缺|收|送|雨鞋|飲用水|衣物|鏟子|藥品|水電|清泥|清淤|搬動|搬運|集合點|道路封閉|不要再派/,
      ]),
    },
    {
      label: "有明確數量、規格或限制",
      matched: hasAny(text, [
        /\d+\s*雙|\d+\s*:\d+|尺寸|多為|暫時不缺|不再收|只接受|已完成報到|一般物資|大型家具|入口公告|預計/,
      ]),
    },
    {
      label: "有可辨識的地點",
      matched: hasClearLocation(text),
    },
    {
      label: "有明確時間或更新時點",
      matched: hasAny(text, [/\d{1,2}:\d{2}/]),
    },
    {
      label: "有明確人員角色或處理者",
      matched: hasAny(text, [
        /值守志工|現場志工|清淤志工|清泥|清淤|水電檢修|水電|工班|家屬|長者|報到|服務台/,
      ]),
    },
  ];

  const score = signals.filter((signal) => signal.matched).length;
  const reasons = signals.map(
    (signal) => `${signal.matched ? "有" : "缺"}：${signal.label}`,
  );

  return {
    score,
    credibility: getCredibilityByScore(score),
    reasons,
  };
}

function createSourceEvidence(sourceType: string) {
  return `訊息來源：${labelForSourceType(sourceType)}`;
}

function createActivityStatus(
  text: string,
  sourceType: string,
): Phase0ActivityStatus {
  const evidence = createSourceEvidence(sourceType);

  if (hasAny(text, [/不要再派|不再收|不要送|封閉|不適合停留/])) {
    return {
      level: "blocked",
      label: "已有人處理，先不要去",
      evidence,
    };
  }

  if (hasAny(text, [/值守志工確認|現場志工.*回報|入口公告|下一次.*盤點/])) {
    return {
      level: "active",
      label: "疑似有人處理中",
      evidence,
    };
  }

  if (hasAny(text, [/有人回報|有人說|有人在群組說|群組說|來電|工班|家屬/])) {
    return {
      level: "reported",
      label: "尚未有人回報處理",
      evidence,
    };
  }

  return {
    level: "reported",
    label: "尚未有人回報處理",
    evidence,
  };
}

export function getManualPhase0ActivityStatus(
  level: Phase0ActivityLevel,
): Phase0ActivityStatus {
  return (
    phase0ActivityStatusOptions.find((option) => option.level === level) ??
    phase0ActivityStatusOptions[0]
  );
}

export function createPhase0ActionLens(
  record: Phase0MessyRecord,
): Phase0ActionLens {
  const text = record.rawText;
  const neededPeople: string[] = [];
  const riskReasons: string[] = [];

  if (hasAny(text, [/清泥|清淤/])) {
    neededPeople.push("清泥人力");
  }
  if (hasAny(text, [/水電|檢修|停電|電力/])) {
    neededPeople.push("水電檢修人員");
  }
  if (hasAny(text, [/雨鞋|飲用水|物資|衣物|鏟子/])) {
    neededPeople.push("物資盤點或後勤人員");
  }
  if (hasAny(text, [/藥品|醫療|長者|親友|不方便使用手機/])) {
    neededPeople.push("關懷確認或醫療協調人員");
  }
  if (hasAny(text, [/道路|封閉|集合點|入口|站|中心|服務台|地址|位置/])) {
    neededPeople.push("現場查核人員");
  }
  if (hasAny(text, [/家具|搬動|搬運/])) {
    neededPeople.push("搬運人力");
  }

  if (neededPeople.length === 0) {
    neededPeople.push("先由資訊整理或現場查核人員判斷");
  }

  const activityStatus = createActivityStatus(text, record.sourceType);

  if (record.verificationStatus !== "verified") {
    riskReasons.push("查核狀態不是已確認，不能直接當成事實。");
  }
  if (record.sourceType === "social_post") {
    riskReasons.push("來源是社群貼文，可能是轉述或過期資訊。");
  }
  if (hasAny(text, [/不知道|疑似|不確定|可能|沒有說|尚未|只有|無法確認/])) {
    riskReasons.push("原文直接指出仍有不確定或缺漏。");
  }
  if (hasAny(text, [/十幾|地址只有|老雜貨店後面/])) {
    riskReasons.push("原文使用概數或模糊地點，行動前還需要補確認。");
  }
  if (hasAny(text, [/昨天|原本那張單|哪一天|沒更新|下午還有沒有/])) {
    riskReasons.push("時間或版本可能已經過期。");
  }
  if (hasAny(text, [/另一位|留言有人說|不缺|不要再派|不再收|不要送/])) {
    riskReasons.push("原文包含衝突、停止或限制訊息，容易讓人白跑。");
  }
  if (hasAny(text, [/長者|親友|家屬|同意公開|完整地址|位置/])) {
    riskReasons.push("涉及當事人同意、位置或隱私，不能直接公開或派工。");
  }
  if (riskReasons.length === 0) {
    riskReasons.push("仍需要人工確認來源、時間、地點與承接狀態。");
  }

  const credibilitySignals = createCredibilitySignals(text);

  let nextStep = "先補問來源、時間、地點、現場狀態與是否已有人承接。";
  if (hasAny(text, [/不要再派|不再收|不要送|封閉|不適合停留/])) {
    nextStep = "先停止直接派人或送物資，確認限制原因與替代去處。";
  } else if (hasAny(text, [/下午還有沒有|盤點|剩|尺寸|暫時不缺/])) {
    nextStep = "先請現場或後勤更新盤點，再決定是否公告需求。";
  } else if (hasAny(text, [/長者|家屬|親友|同意公開|無法確認/])) {
    nextStep = "先由人工聯繫確認當事人意願、位置與需求，再評估是否建立任務。";
  } else if (hasAny(text, [/水電|檢修/])) {
    nextStep = "先確認水電需求地點、危險程度與是否已有工班承接。";
  } else if (hasAny(text, [/清泥|清淤|搬動|搬運/])) {
    nextStep = "先確認精確位置、所需人數、現場安全與是否已有隊伍前往。";
  }

  return {
    summary: text,
    neededPeople: unique(neededPeople),
    activityStatus,
    credibility: credibilitySignals.credibility,
    credibilityReasons: credibilitySignals.reasons,
    riskReasons: unique(riskReasons),
    nextStep,
  };
}
