import { PageContainer } from '@ant-design/pro-components';
import { createFileRoute } from '@tanstack/react-router';
import { requireCode } from '@/permission/can';

// 占位页：本切片只验证页面级权限守卫，业务内容在业务页切片实现
export const Route = createFileRoute('/_authenticated/system/user')({
  beforeLoad: ({ context }) => requireCode(context.me, 'UserManage'),
  component: () => <PageContainer title="用户管理">待实现（业务页切片）</PageContainer>,
});
