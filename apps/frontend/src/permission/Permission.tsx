import type { ReactNode } from 'react';
import { useUserControllerCurrentUser } from '@/apis/generated/user/user';
import { can } from './can';

// 按钮级（COMPON）权限双形态（PLAN §5.5）。数据源直接复用 currentUser 的 Query 缓存
//（_authenticated beforeLoad 已 ensureQueryData，这里不会二次请求）。
// 前端隐藏只是体验层，后端 @RequirePermission 才是安全权威
export function usePermission() {
  const me = useUserControllerCurrentUser();
  return { has: (code: string) => (me.data ? can(me.data, code) : false) };
}

export function Permission(props: { code: string; children: ReactNode; fallback?: ReactNode }) {
  const { has } = usePermission();
  return has(props.code) ? props.children : (props.fallback ?? null);
}
