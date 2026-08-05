import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

type Expense = { id: string; merchant: string; amount: string };

const columns: DataTableColumn<Expense>[] = [
  { key: "merchant", header: "Nơi chi", render: (row) => row.merchant },
  {
    key: "amount",
    header: "Số tiền",
    align: "right",
    render: (row) => row.amount,
  },
];

const rows: Expense[] = [
  { id: "e1", merchant: "Tiền điện", amount: "850.000 ₫" },
  { id: "e2", merchant: "VinMart", amount: "1.250.000 ₫" },
];

describe("DataTable", () => {
  it("render caption, header và mọi hàng", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
      />,
    );

    expect(html).toContain('data-testid="data-table"');
    expect(html).toContain("Lịch sử chi tiêu");
    expect(html).toContain("Nơi chi");
    expect(html).toContain("Tiền điện");
    expect(html).toContain("VinMart");
    expect(html).toContain("1.250.000 ₫");
  });

  it("gắn scope=col cho mọi header", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
      />,
    );

    expect(html.match(/scope="col"/g)).toHaveLength(2);
  });

  it("căn phải và dùng tabular-nums cho cột align=right", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
      />,
    );

    expect(html).toContain("text-right");
    expect(html).toContain("tabular-nums");
  });

  it("render emptyContent và không render table khi không có hàng", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
        emptyContent={<p>Chưa có khoản chi nào.</p>}
      />,
    );

    expect(html).toContain("Chưa có khoản chi nào.");
    expect(html).not.toContain("<table");
  });

  it("không render gì khi rỗng và không truyền emptyContent", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
      />,
    );

    expect(html).toBe("");
  });
});
