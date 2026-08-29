import { redirect } from "@tanstack/react-router";
import type { CurrentUserVo } from "@/apis/generated/storeWebAPI.schemas";

// 权限判定唯一入口（usePermission / 菜单过滤 / 路由守卫共用）。
// userType=0 超管旁路与后端 PermissionGuard 同一规则：种子数据超管角色只挂页面码、
// 按钮码全在低权角色上，两端必须同语义否则前后端表现分裂
export function can(me: CurrentUserVo, code: string): boolean {
  return me.userType === 0 || me.permissions.some((p) => p.code === code);
}

// 页面级守卫：beforeLoad 里一行调用，无权跳 403 页（无 token 的情况 _authenticated 层已拦）
export function requireCode(me: CurrentUserVo, code: string): void {
  if (!can(me, code)) throw redirect({ to: "/403" });
}
