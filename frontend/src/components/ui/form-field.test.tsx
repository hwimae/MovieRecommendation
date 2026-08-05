import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField } from "./form-field";

describe("FormField", () => {
  it("render input với label, hint và data-testid", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-merchant" label="Nơi chi" hint="Ví dụ: VinMart" />,
    );

    expect(html).toContain('data-testid="form-field"');
    expect(html).toContain('data-kind="input"');
    expect(html).toContain("Nơi chi");
    expect(html).toContain("Ví dụ: VinMart");
    expect(html).toContain('id="expense-merchant"');
  });

  it("render textarea khi kind=textarea", () => {
    const html = renderToStaticMarkup(
      <FormField kind="textarea" id="expense-description" label="Mô tả chi tiết" rows={3} />,
    );

    expect(html).toContain('data-kind="textarea"');
    expect(html).toContain("<textarea");
    expect(html).toContain("Mô tả chi tiết");
  });

  it("render select với đủ option khi kind=select", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="select"
        id="expense-category"
        label="Danh mục"
        value=""
        onValueChange={() => {}}
        options={[
          { value: "food", label: "Ăn uống" },
          { value: "home", label: "Nhà cửa" },
        ]}
      />,
    );

    expect(html).toContain('data-kind="select"');
    expect(html).toContain("Danh mục");
    expect(html).toContain("Ăn uống");
    expect(html).toContain("Nhà cửa");
  });

  it("render radio với đủ option khi kind=radio", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="radio"
        id="review-rating"
        label="Điểm đánh giá"
        value="5"
        onValueChange={() => {}}
        options={[
          { value: "4", label: "4 sao" },
          { value: "5", label: "5 sao" },
        ]}
      />,
    );

    expect(html).toContain('data-kind="radio"');
    expect(html).toContain("Điểm đánh giá");
    expect(html).toContain("4 sao");
    expect(html).toContain("5 sao");
  });

  it("gắn aria-invalid và aria-describedby khi có error", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-amount" label="Số tiền" error="Vui lòng nhập số tiền hợp lệ." />,
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="expense-amount-error"');
    expect(html).toContain('id="expense-amount-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Vui lòng nhập số tiền hợp lệ.");
  });

  it("không gắn aria-invalid khi không có error", () => {
    const html = renderToStaticMarkup(<FormField id="expense-amount" label="Số tiền" />);

    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain('role="alert"');
  });

  it("đánh dấu required trên control", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-amount" label="Số tiền" required />,
    );

    expect(html).toContain("required");
  });

  it("hiện error thay cho hint khi có cả hai", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="expense-amount"
        label="Số tiền"
        hint="Nhập số, tự chèn dấu phân cách"
        error="Vui lòng nhập số tiền hợp lệ."
      />,
    );

    expect(html).toContain("Vui lòng nhập số tiền hợp lệ.");
    expect(html).not.toContain("Nhập số, tự chèn dấu phân cách");
  });
});
