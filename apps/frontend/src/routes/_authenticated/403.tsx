import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button, Result } from 'antd';

// 页面级无权限的统一落点（requireCode 跳转来）；无 token 场景不进这里，直接回 /login
export const Route = createFileRoute('/_authenticated/403')({ component: ForbiddenPage });

function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="没有访问该页面的权限，请联系管理员分配"
      extra={
        <Button type="primary" onClick={() => void navigate({ to: '/' })}>
          回首页
        </Button>
      }
    />
  );
}
