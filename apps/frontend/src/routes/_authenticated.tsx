import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getToken } from '@/stores/auth';

// 无路径布局路由：业务页面全部挂在它下面，beforeLoad 统一拦未登录（PLAN §5.5）。
// 这里只判"有没有 token"；token 是否有效由后端裁决——接口 401 时 ky hook 清 token 回登录页
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: Outlet,
});
