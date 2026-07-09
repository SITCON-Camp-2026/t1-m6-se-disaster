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
    expect(screen.getByText("需要的人員種類：")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "目前狀態" })).toHaveValue(
      "reported",
    );
    expect(screen.getByText("訊息來源：")).toBeInTheDocument();
    expect(screen.getByText("社群轉錄")).toBeInTheDocument();
    expect(screen.getByText("目前風險與可信度原因")).toBeInTheDocument();
    expect(screen.getByText("有：有提到需求或缺什麼物資")).toBeInTheDocument();
    expect(screen.getByText("下一步建議")).toBeInTheDocument();
  });

  it("lets action takers change the activity status menu", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "行動者判讀" }));
    fireEvent.change(screen.getByRole("combobox", { name: "目前狀態" }), {
      target: { value: "blocked" },
    });

    expect(screen.getByRole("combobox", { name: "目前狀態" })).toHaveValue(
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

  it("links to the v1 action flow from the home page", () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: "進入 v1 行動者確認流程" }),
    ).toHaveAttribute("href", "./v1/");
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
      screen.getByRole("heading", { name: "能不能直接行動？" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("資料仍來自 Phase 0 原始資訊", { exact: false }),
    ).toBeInTheDocument();
  });
});
