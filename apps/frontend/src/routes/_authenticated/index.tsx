import { PageContainer } from '@ant-design/pro-components';
import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, Descriptions, Space, Tag } from 'antd';
import { Permission, usePermission } from '@/permission/Permission';

// 首页看板进看板切片；当前作为按钮级权限（COMPON）双形态的演示与实测挂点。
// 页面守卫豁免：菜单里"首页"仍按 Home 码过滤，但登录后落地页不设门槛，避免"登录成功即 403"死角
export const Route = createFileRoute('/_authenticated/')({ component: HomePage });

function HomePage() {
  const { me } = Route.useRouteContext();
  const { has } = usePermission();

  return (
    <PageContainer title={`欢迎，${me.username}`}>
      <Card title="当前用户">
        <Descriptions
          column={1}
          items={[
            { key: 'r', label: '角色', children: me.roles.map((r) => <Tag key={r}>{r}</Tag>) },
            { key: 'p', label: '权限点数', children: me.permissions.length },
            { key: 'b', label: 'usePermission(delete:user)', children: String(has('delete:user')) },
          ]}
        />
      </Card>
      <Card title="按钮权限演示（Permission 组件，正式用法进业务页）" style={{ marginTop: 16 }}>
        <Space>
          <Permission code="delete:user">
            <Button danger data-testid="btn-delete-user">
              删除用户（delete:user）
            </Button>
          </Permission>
          <Permission code="delete:activity">
            <Button data-testid="btn-delete-activity">删除活动（delete:activity）</Button>
          </Permission>
          <Permission code="delete:role" fallback={<Tag data-testid="no-delete-role">无 delete:role 权限</Tag>}>
            <Button danger data-testid="btn-delete-role">
              删除角色（delete:role）
            </Button>
          </Permission>
        </Space>
      </Card>
    </PageContainer>
  );
}
