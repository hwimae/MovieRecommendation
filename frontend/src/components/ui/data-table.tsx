import clsx from "clsx";
import React, { type ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  /** Bắt buộc — trình đọc màn hình cần biết bảng này nói về cái gì. */
  caption: string;
  emptyContent?: ReactNode;
  className?: string;
};

function alignClass(align: DataTableColumn<unknown>["align"]): string {
  return align === "right" ? "text-right tabular-nums" : "text-left";
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  emptyContent,
  className,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return emptyContent ? <>{emptyContent}</> : null;
  }

  return (
    <div
      className={clsx("overflow-x-auto", className)}
      data-testid="data-table"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  "border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted",
                  alignClass(column.align),
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    "border-b border-surfaceMuted px-3 py-2.5 text-text",
                    alignClass(column.align),
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
