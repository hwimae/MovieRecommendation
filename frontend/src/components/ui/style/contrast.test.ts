import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("trả 21 cho cặp đen trắng", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("trả 1 cho hai màu giống nhau", () => {
    expect(contrastRatio("#0369a1", "#0369a1")).toBeCloseTo(1, 5);
  });

  it("không phụ thuộc thứ tự tham số", () => {
    expect(contrastRatio("#0369a1", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#0369a1"),
      5,
    );
  });

  it("khớp giá trị đã tính tay cho primary trên nền trắng", () => {
    expect(contrastRatio("#0369a1", "#ffffff")).toBeCloseTo(5.93, 1);
  });
});
