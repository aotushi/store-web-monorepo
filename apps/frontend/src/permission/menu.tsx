import {
  AppstoreOutlined,
  GiftOutlined,
  HomeOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";
import type { ReactNode } from "react";
import type { CurrentUserVo } from "@/apis/generated/storeWebAPI.schemas";
import { can } from "./can";

// 静态路由表 × 权限点过滤（PLAN §5.5）：菜单结构对齐种子权限树（MENU/PAGE 码），
// 路径对齐 src/routes/ 文件路由；后端动态路由是预留扩展点，第一版不做
interface MenuDef {
  name: string;
  code: string;
  path?: string;
  icon?: ReactNode;
  children?: MenuDef[];
}

export const MENU_DEFS: MenuDef[] = [
  { name: "首页", code: "Home", path: "/", icon: <HomeOutlined /> },
  {
    name: "商品管理",
    code: "ProductManage",
    icon: <AppstoreOutlined />,
    children: [
      { name: "商品列表", code: "ProductList", path: "/product" },
      { name: "热销商品", code: "HotProductList", path: "/product/hot" },
    ],
  },
  { name: "订单管理", code: "OrderManage", path: "/order", icon: <ShoppingCartOutlined /> },
  { name: "活动管理", code: "ActivityManage", path: "/activity", icon: <GiftOutlined /> },
  {
    name: "系统管理",
    code: "SysManage",
    icon: <SettingOutlined />,
    children: [
      { name: "用户管理", code: "UserManage", path: "/system/user" },
      { name: "角色管理", code: "RoleManage", path: "/system/role" },
      { name: "权限管理", code: "PermissionManage", path: "/system/permission" },
    ],
  },
];

// 显隐规则：叶子看自身权限码；目录看"有无可见子项"而不看自身码——
// 种子数据实锤超管角色缺 ProductManage/SysManage 目录码却有全部子页码，目录码作门槛会把树砍断
export function filterMenu(defs: MenuDef[], me: CurrentUserVo): MenuDataItem[] {
  const result: MenuDataItem[] = [];
  for (const def of defs) {
    if (def.children?.length) {
      const children = filterMenu(def.children, me);
      if (children.length)
        result.push({ name: def.name, icon: def.icon, path: def.path, children });
    } else if (can(me, def.code)) {
      result.push({ name: def.name, icon: def.icon, path: def.path });
    }
  }
  return result;
}
