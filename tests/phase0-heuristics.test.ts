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
    expect(inferSourceExplanation("志工在現場回報，說有人需要協助")).toBe("現場回報");
    expect(inferSourceExplanation("有人打電話來說停電了")).toBe("電話");
    expect(inferSourceExplanation("社群貼文轉錄，內容提到缺水")).toBe("社群轉錄");
  });
});
