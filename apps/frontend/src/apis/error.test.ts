import type { FormInstance } from "antd";
import { describe, expect, it } from "vitest";
import { applyFieldErrors, errorText } from "./error";
import { ApiError } from "./mutator";

// 假 form 只记录 setFields 调用参数
const fakeForm = () => {
  const calls: unknown[] = [];
  return { calls, form: { setFields: (f: unknown) => calls.push(f) } as unknown as FormInstance };
};

describe("applyFieldErrors", () => {
  it("字段级 400 数组回填 setFields 并返回 true", () => {
    const { form, calls } = fakeForm();
    const err = new ApiError(400, "请求参数有误", [
      { field: "username", errors: ["用户名不能超过 32 个字符"] },
    ]);
    expect(applyFieldErrors(form, err)).toBe(true);
    expect(calls[0]).toEqual([{ name: "username", errors: ["用户名不能超过 32 个字符"] }]);
  });

  it("detail 非数组（普通业务错误）不动表单，返回 false", () => {
    const { form, calls } = fakeForm();
    expect(applyFieldErrors(form, new ApiError(409, "用户名已存在", "用户名已存在"))).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("非 ApiError（HTTP 层杂音）返回 false", () => {
    const { form } = fakeForm();
    expect(applyFieldErrors(form, new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("errorText", () => {
  it("Error 取 message，非 Error 用兜底文案", () => {
    expect(errorText(new ApiError(409, "用户名已存在"))).toBe("用户名已存在");
    expect(errorText("boom")).toBe("操作失败");
  });
});
