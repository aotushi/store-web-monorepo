import { describe, expect, it } from "vitest";
import type { CurrentUserVo, Permission } from "@/apis/generated/storeWebAPI.schemas";
import { can } from "./can";
import { filterMenu, MENU_DEFS } from "./menu";

// 纯逻辑必测清单第一项：权限过滤（PLAN §5.7）。用例贴种子数据真实形状

const perm = (code: string): Permission => ({ id: 0, title: code, code, type: 1, parentId: 0 });

const user = (codes: string[], userType = 1): CurrentUserVo => ({
  id: 2,
  username: "test1",
  email: "",
  avatar: "",
  userType,
  roles: ["服务员"],
  permissions: codes.map(perm),
});

// 菜单树压平成 name 列表，断言只关心"哪些项可见"
const names = (items: ReturnType<typeof filterMenu>): string[] =>
  items.flatMap((i) => [i.name as string, ...names((i.children as never[]) ?? [])]);

describe("can", () => {
  it("普通用户按权限码平铺匹配", () => {
    const me = user(["Home", "delete:user"]);
    expect(can(me, "delete:user")).toBe(true);
    expect(can(me, "delete:role")).toBe(false);
  });

  it("userType=0 超管旁路：无任何权限码也全放行（与后端 PermissionGuard 同语义）", () => {
    expect(can(user([], 0), "delete:role")).toBe(true);
  });
});

describe("filterMenu", () => {
  it("服务员（种子数据实况）：只见首页与商品管理下的热销商品", () => {
    const me = user(["Home", "HotProductList", "delete:activity", "delete:user", "freezed:user"]);
    expect(names(filterMenu(MENU_DEFS, me))).toEqual(["首页", "商品管理", "热销商品"]);
  });

  it("目录显隐由子项联动，目录自身码不作门槛（超管角色缺 ProductManage/SysManage 码）", () => {
    const me = user(["ProductList", "UserManage"]);
    expect(names(filterMenu(MENU_DEFS, me))).toEqual([
      "商品管理",
      "商品列表",
      "系统管理",
      "用户管理",
    ]);
  });

  it("无可见子项的目录整个消失；空权限集只剩空菜单", () => {
    expect(filterMenu(MENU_DEFS, user([]))).toEqual([]);
  });

  it("超管旁路拿到全量菜单", () => {
    expect(names(filterMenu(MENU_DEFS, user([], 0)))).toHaveLength(10);
  });
});
