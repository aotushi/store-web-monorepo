import { LogoutOutlined } from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Dropdown } from "antd";
import { useSetAtom } from "jotai";
import { getUserControllerCurrentUserQueryOptions } from "@/apis/generated/user/user";
import { filterMenu, MENU_DEFS } from "@/permission/menu";
import { getToken, tokenAtom } from "@/stores/auth";

// 无路径布局路由 = 认证 + 布局双职责：
// beforeLoad 拦未登录并预取 currentUser（写进 Query 缓存 + 路由 context，子路由守卫/组件零重复请求）；
// token 有效性由后端裁决——伪造/过期 token 在 ensureQueryData 处 401，ky hook 清 token 硬跳登录
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    if (!getToken()) throw redirect({ to: "/login" });
    const me = await context.queryClient.ensureQueryData(
      getUserControllerCurrentUserQueryOptions(),
    );
    return { me };
  },
  component: AppLayout,
});

function AppLayout() {
  const { me } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const setToken = useSetAtom(tokenAtom);

  const logout = () => {
    setToken(null);
    void navigate({ to: "/login" });
  };

  return (
    <ProLayout
      title="数字门店系统"
      layout="mix"
      location={{ pathname }}
      // 菜单 = 静态路由表 × 权限点过滤（PLAN §5.5）；me 变更（重登）即重算
      menuDataRender={() => filterMenu(MENU_DEFS, me)}
      menuItemRender={(item, dom) => (item.path ? <Link to={item.path}>{dom}</Link> : dom)}
      avatarProps={{
        title: me.username,
        size: "small",
        render: (_props, dom) => (
          <Dropdown
            menu={{
              items: [
                { key: "logout", icon: <LogoutOutlined />, label: "退出登录", onClick: logout },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
}
