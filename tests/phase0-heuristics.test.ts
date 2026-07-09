import { describe, expect, it } from "vitest";
import messyReports from "../src/fixtures/phase-0/messy-reports.json";
import {
  buildPhase0Drafts,
  getDraftDetailLabel,
  getDraftDetailOptions,
  getDraftSupportLabel,
  getPhase0SummaryStats,
  inferSourceExplanation,
} from "../src/features/phase-0/phase0-drafts";
import { createPhase0ActionLens } from "../src/features/phase-0/phase0-action-lens";
import { createPhase0Judgement } from "../src/features/phase-0/phase0-heuristics";

describe("phase 0 heuristics", () => {
  it("loads the current phase 0 messy data", () => {
    expect(messyReports).toHaveLength(12);
    expect(messyReports.map((record) => record.id)).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => `M-${String(index + 1).padStart(3, "0")}`,
      ),
    );
  });

  it("creates conservative safety placeholders for all records", () => {
    const judgements = messyReports.map(createPhase0Judgement);

    expect(judgements).toHaveLength(messyReports.length);
    expect(
      judgements.filter((judgement) => judgement.unsafeToActDirectly),
    ).toHaveLength(messyReports.length);
    expect(
      judgements.filter((judgement) => judgement.possibleKind === "unknown"),
    ).toHaveLength(messyReports.length);
    expect(
      judgements.filter((judgement) => judgement.confidence === "low"),
    ).toHaveLength(messyReports.length);
  });

  it("does not treat review-needed records as confirmed facts", () => {
    const judgement = createPhase0Judgement(messyReports[9]);

    expect(messyReports[9].verificationStatus).toBe("needs_review");
    expect(judgement.unsafeToActDirectly).toBe(true);
    expect(judgement.evidence.join(" ")).not.toContain("verified");
  });

  it("does not infer candidate kind from the starter text", () => {
    const judgement = createPhase0Judgement(messyReports[10]);

    expect(judgement.possibleKind).toBe("unknown");
    expect(judgement.suggestedNextStep).toBe("send_to_human_review");
  });

  it("builds editable drafts with review, announcement, support, reliability, and notes", () => {
    const drafts = buildPhase0Drafts(messyReports);

    expect(drafts).toHaveLength(messyReports.length);
    expect(drafts[0]?.needsHumanReview).toBe(true);
    expect(drafts[5]?.needsAnnouncement).toBe(true);
    expect(drafts[0]?.supportNeed).toBe("people");
    expect(drafts[1]?.supportNeed).toBe("resources");
    expect(getDraftSupportLabel("people")).toBe("人力");
    expect(getDraftSupportLabel("power")).toBe("水電");
    expect(getDraftSupportLabel("resources")).toBe("物資");
    expect(getDraftSupportLabel("none")).toBe("無");
    expect(["現場回報", "志工更新", "社群轉錄"]).toContain(
      drafts[0]?.sourceExplanation,
    );
    expect(typeof drafts[0]?.confirmedInfo).toBe("string");
    expect(typeof drafts[0]?.uncertainInfo).toBe("string");
    expect(typeof drafts[0]?.resourceDetailType).toBe("string");
    expect(getDraftDetailLabel("inspection")).toBe("查核人員");
    expect(getDraftDetailLabel("debris")).toBe("清泥人員");
    expect(getDraftDetailOptions("resources")).toContain("water");
    expect(getDraftDetailOptions("people")).toContain("inspection");
  });

  it("derives trusted and pending summary counts from reliability", () => {
    const drafts = buildPhase0Drafts(messyReports);
    const stats = getPhase0SummaryStats(drafts, messyReports.length);

    expect(stats.trustedCount).toBe(4);
    expect(stats.pendingCount).toBe(8);
    expect(stats.trustedCount + stats.pendingCount).toBe(messyReports.length);
  });

  it("infers source explanation from the record text", () => {
    expect(inferSourceExplanation("志工在現場回報，說有人需要協助")).toBe(
      "現場回報",
    );
    expect(inferSourceExplanation("有人打電話來說停電了")).toBe("電話");
    expect(inferSourceExplanation("社群貼文轉錄，內容提到缺水")).toBe(
      "社群轉錄",
    );
  });

  it("keeps action lens suggestions conservative for action takers", () => {
    const lens = createPhase0ActionLens(messyReports[10]);

    expect(lens.neededPeople).toContain("搬運人力");
    expect(lens.activityStatus.label).toBe("尚未有人回報處理");
    expect(lens.activityStatus.evidence).toBe("訊息來源：現場回報");
    expect(lens.riskReasons.join(" ")).toContain("隱私");
    expect(lens.nextStep).toContain("當事人意願");
  });

  it("shows blocked activity status when the record says people should not go or send items", () => {
    const lens = createPhase0ActionLens(messyReports[8]);

    expect(messyReports[8].id).toBe("M-009");
    expect(lens.activityStatus.level).toBe("blocked");
    expect(lens.activityStatus.label).toBe("已有人處理，先不要去");
    expect(lens.activityStatus.evidence).toBe("訊息來源：現場回報");
  });

  it("shows in-progress activity status when field staff are updating the record without stop instructions", () => {
    const lens = createPhase0ActionLens({
      id: "example",
      rawText:
        "14:20 現場志工回報：集合點仍開放，入口公告已更新，下一次盤點預計 16:30。",
      sourceType: "field_report",
      verificationStatus: "needs_review",
      updatedAt: "2026-07-20T14:20:00+08:00",
    });

    expect(lens.activityStatus.level).toBe("active");
    expect(lens.activityStatus.label).toBe("疑似有人處理中");
  });

  it("does not mark unverified action lens records as high credibility", () => {
    const lens = createPhase0ActionLens(messyReports[3]);

    expect(messyReports[3].verificationStatus).toBe("unverified");
    expect(lens.credibility).not.toBe("高");
    expect(lens.riskReasons.join(" ")).toContain("不能直接當成事實");
  });

  it("scores M-001 as medium-low because its people count and location are vague", () => {
    const lens = createPhase0ActionLens(messyReports[0]);

    expect(messyReports[0].id).toBe("M-001");
    expect(lens.credibility).toBe("中低");
    expect(lens.credibilityReasons).toContain("缺：有明確數量、規格或限制");
    expect(lens.credibilityReasons).toContain("缺：有可辨識的地點");
    expect(lens.riskReasons.join(" ")).toContain("概數或模糊地點");
  });

  it("scores M-010 as high credibility because all five action signals are present", () => {
    const lens = createPhase0ActionLens(messyReports[9]);

    expect(messyReports[9].id).toBe("M-010");
    expect(lens.credibility).toBe("高");
    expect(lens.credibilityReasons).toHaveLength(5);
    expect(
      lens.credibilityReasons.every((reason) => reason.startsWith("有")),
    ).toBe(true);
  });

  it("only scores M-009 and M-010 as high credibility action-lens records", () => {
    const highCredibilityIds = messyReports
      .filter((record) => createPhase0ActionLens(record).credibility === "高")
      .map((record) => record.id);

    expect(highCredibilityIds).toEqual(["M-009", "M-010"]);
  });
});
