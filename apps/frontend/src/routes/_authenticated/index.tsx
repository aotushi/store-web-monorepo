import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button, Descriptions, Spin, Tag } from 'antd';
import { useSetAtom } from 'jotai';
import { useUserControllerCurrentUser } from '@/apis/generated/user/user';
import { tokenAtom } from '@/stores/auth';

export const Route = createFileRoute('/_authenticated/')({ component: HomePage });

// 临时首页：证明"守卫放行 → token 注入 → currentUser 取回角色/权限点"闭环。
// ProLayout 壳 + 菜单权限过滤进权限四件套切片后替换本文件
function HomePage() {
  const navigate = useNavigate();
  const setToken = useSetAtom(tokenAtom);
  const me = useUserControllerCurrentUser();

  const logout = () => {
    setToken(null);
    void navigate({ to: '/login' });
  };

  if (me.isPending) return <Spin style={{ margin: 48 }} />;
  if (me.isError) return <p style={{ margin: 48 }}>加载用户信息失败</p>;

  return (
    <div style={{ padding: 48 }}>
      <Descriptions
        title="当前用户（契约链路 + 认证闭环验证）"
        column={1}
        bordered
        items={[
          { key: 'u', label: '用户名', children: `${me.data.username}#${me.data.id}` },
          {
            key: 'r',
            label: '角色',
            children: me.data.roles.map((r) => <Tag key={r}>{r}</Tag>),
          },
          { key: 'p', label: '权限点数', children: me.data.permissions.length },
        ]}
      />
      <Button style={{ marginTop: 24 }} onClick={logout} data-testid="logout">
        退出登录
      </Button>
    </div>
  );
}
