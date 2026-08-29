import type { Permission } from "@/apis/generated/storeWebAPI.schemas";

export interface PermissionTreeNode {
  key: number;
  title: string;
  children?: PermissionTreeNode[];
}

// 平铺权限点（parentId 关联）组装成 antd Tree 数据：parentId=0 为根；
// parentId 指向不存在节点时挂根兜底——组树宁可层级错也不能丢节点（丢了就没法勾）
export function buildPermissionTree(perms: Permission[]): PermissionTreeNode[] {
  const nodes = new Map<number, PermissionTreeNode>();
  for (const p of perms) {
    nodes.set(p.id, { key: p.id, title: `${p.title}（${p.code}）` });
  }

  const roots: PermissionTreeNode[] = [];
  for (const p of perms) {
    const node = nodes.get(p.id);
    if (!node) continue;
    const parent = p.parentId ? nodes.get(p.parentId) : undefined;
    if (parent) {
      parent.children ??= [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
