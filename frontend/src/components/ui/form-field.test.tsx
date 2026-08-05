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
      <FormField
        kind="textarea"
        id="expense-description"
        label="Mô tả chi tiết"
        rows={3}
      />,
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

  it("khóa toàn bộ radio khi isDisabled", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="radio"
        id="review-rating"
        label="Điểm đánh giá"
        value="5"
        onValueChange={() => {}}
        isDisabled
        options={[
          { value: "4", label: "4 sao" },
          { value: "5", label: "5 sao" },
        ]}
      />,
    );

    expect(html).toContain('data-disabled="true"');
    expect(html).toContain('disabled=""');
  });

  it("gắn aria-invalid và aria-describedby khi có error", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="expense-amount"
        label="Số tiền"
        error="Vui lòng nhập số tiền hợp lệ."
      />,
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="expense-amount-error"');
    expect(html).toContain('id="expense-amount-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Vui lòng nhập số tiền hợp lệ.");
  });

  it("không gắn aria-invalid khi không có error", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-amount" label="Số tiền" />,
    );

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

  it("giữ nguyên aria-describedby của caller khi không có error (kind input)", () => {
    const html = renderToStaticMarkup(
      <FormField id="login-email" label="Email" aria-describedby="login-error" />,
    );

    expect(html).toContain('aria-describedby="login-error"');
  });

  it("gộp aria-describedby của caller với id lỗi khi field vừa có error vừa được caller truyền describedby", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="x"
        label="Trường"
        error="Không hợp lệ"
        aria-describedby="login-error"
      />,
    );

    expect(html).toContain('aria-describedby="x-error login-error"');
  });

  it("gắn id cho hint và nối vào aria-describedby khi có hint, không có error", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-merchant" label="Nơi chi" hint="Ví dụ: VinMart" />,
    );

    expect(html).toContain('id="expense-merchant-hint"');
    expect(html).toContain('aria-describedby="expense-merchant-hint"');
  });

  it("ưu tiên id lỗi, không lẫn id hint vào aria-describedby khi có cả hint và error", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="expense-amount"
        label="Số tiền"
        hint="Nhập số, tự chèn dấu phân cách"
        error="Vui lòng nhập số tiền hợp lệ."
      />,
    );

    expect(html).toContain('aria-describedby="expense-amount-error"');
    expect(html).not.toContain("expense-amount-hint");
  });

  it("select required hiển thị dấu bắt buộc trên control ẩn", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="select"
        id="expense-category"
        label="Danh mục"
        value=""
        onValueChange={() => {}}
        required
        options={[{ value: "food", label: "Ăn uống" }]}
      />,
    );

    expect(html).toContain('required=""');
  });

  it("select và radio không crash khi options rỗng, label vẫn hiển thị", () => {
    const selectHtml = renderToStaticMarkup(
      <FormField
        kind="select"
        id="empty-select"
        label="Chọn danh mục"
        value=""
        onValueChange={() => {}}
        options={[]}
      />,
    );
    const radioHtml = renderToStaticMarkup(
      <FormField
        kind="radio"
        id="empty-radio"
        label="Chọn mức độ"
        value=""
        onValueChange={() => {}}
        options={[]}
      />,
    );

    expect(selectHtml).toContain("Chọn danh mục");
    expect(radioHtml).toContain("Chọn mức độ");
  });
});
