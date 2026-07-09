import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders starter title", () => {
    render(<App />);
    expect(screen.getByText("災害資訊整理工作台")).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "原始資訊" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "整理工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "行動者判讀" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows review states in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(
      screen.getByText(
        "第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("shows an action-taker lens without claiming ownership is confirmed", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "行動者判讀" }));

    expect(
      screen.getByRole("heading", { name: "行動者判讀", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("可行動判斷度")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /可執行區/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /資料不足區/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("可能需要的人")).toBeInTheDocument();
    expect(screen.getByText("可行動判斷說明")).toBeInTheDocument();
    expect(
      screen.queryByText("有：有提到需求或缺什麼物資"),
    ).not.toBeInTheDocument();
  });

  it("lets action takers change the activity status menu", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "行動者判讀" }));
    fireEvent.change(screen.getByRole("combobox", { name: "v1 目前狀態" }), {
      target: { value: "blocked" },
    });

    expect(screen.getByRole("combobox", { name: "v1 目前狀態" })).toHaveValue(
      "blocked",
    );
    expect(screen.queryByText("行動提醒")).not.toBeInTheDocument();
  });

  it("keeps the action-taker lens separate from the editing workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getByText("人類草稿")).toBeInTheDocument();
    expect(screen.queryByLabelText("行動者判讀")).not.toBeInTheDocument();
  });

  it("keeps draft CRUD as learner work instead of starter output", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getByText("尚未建立整理草稿")).toBeInTheDocument();
    expect(
      screen.getByText(/請 agent 加上建立、編輯、刪除或重設整理草稿/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/已產生 \d+ 筆安全邊界草稿/),
    ).not.toBeInTheDocument();
  });

  it("does not show a separate v1 entry link on the home page", () => {
    render(<App />);

    expect(
      screen.queryByRole("link", { name: "進入 v1 行動者確認流程" }),
    ).not.toBeInTheDocument();
  });

  it("renders the v1 action flow at the v1 route", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    expect(screen.getByText("去之前先確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "看內容摘要" }));
    expect(
      screen.getByRole("heading", { name: "看訊息來源與查核狀態" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "可行動判斷說明" }),
    ).toBeInTheDocument();
    expect(screen.getByText("最重要判斷")).toBeInTheDocument();
    expect(screen.getByText("可行動判斷度")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /可執行區/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /資料不足區/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("資料仍來自 Phase 0 原始資訊", { exact: false }),
    ).toBeInTheDocument();
  });

  it("filters v1 records and shows a supplement field for insufficient data", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /資料不足區/ }));

    expect(screen.getByText("補充資訊")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "補充資訊" })).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "補充資訊" }), {
      target: { value: "補充：現場更新時間待確認" },
    });
    expect(screen.getByRole("textbox", { name: "補充資訊" })).toHaveValue(
      "補充：現場更新時間待確認",
    );
  });
});
