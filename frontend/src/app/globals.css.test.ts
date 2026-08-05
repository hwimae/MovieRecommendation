import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mốc chặn: globals.css chỉ được ngắn đi, không bao giờ dài thêm.
 * Style mới phải đi qua src/components/ui/ (primitive + style/), không thêm
 * class bespoke vào đây. Khi migrate xong một màn thì hạ con số này xuống.
 * KHÔNG BAO GIỜ nâng con số này lên.
 */
const MAX_LINES = 2914;

describe("globals.css", () => {
  it(`không dài quá ${MAX_LINES} dòng`, () => {
    const source = readFileSync(join(__dirname, "globals.css"), "utf8");
    const lineCount = source.split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(MAX_LINES);
  });
});
