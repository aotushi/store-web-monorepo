import { PageContainer } from '@ant-design/pro-components';
import { createFileRoute } from '@tanstack/react-router';
import { Card, Descriptions, Tag } from 'antd';

// 首页看板进看板切片；按钮级权限的正式用法见用户管理页（原演示卡已撤）。
// 页面守卫豁免：菜单里"首页"仍按 Home 码过滤，但登录后落地页不设门槛，避免"登录成功即 403"死角
export const Route = createFileRoute('/_authenticated/')({ component: HomePage });

function HomePage() {
  const { me } = Route.useRouteContext();

  return (
    <PageContainer title={`欢迎，${me.username}`}>
      <Card title="当前用户">
        <Descriptions
          column={1}
          items={[
            { key: 'r', label: '角色', children: me.roles.map((r) => <Tag key={r}>{r}</Tag>) },
            { key: 'p', label: '权限点数', children: me.permissions.length },
          ]}
        />
      </Card>
    </PageContainer>
  );
}
