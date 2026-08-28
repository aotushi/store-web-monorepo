import { describe, expect, it } from 'vitest';
import type { Permission } from '@/apis/generated/storeWebAPI.schemas';
import { buildPermissionTree } from './tree';

// 形状贴种子数据：SysManage(菜单) > UserManage(页面) > delete:user(按钮) 三层
const perm = (id: number, title: string, code: string, type: number, parentId: number) =>
  ({ id, title, code, type, parentId }) as Permission;

describe('buildPermissionTree', () => {
  it('parentId 链组出三层嵌套，parentId=0 为根', () => {
    const tree = buildPermissionTree([
      perm(5, '系统管理', 'SysManage', 0, 0),
      perm(6, '用户管理', 'UserManage', 1, 5),
      perm(15, '删除用户', 'delete:user', 3, 6),
      perm(1, '首页', 'Home', 0, 0),
    ]);
    expect(tree.map((n) => n.key)).toEqual([5, 1]);
    expect(tree[0].children?.map((n) => n.key)).toEqual([6]);
    expect(tree[0].children?.[0].children?.map((n) => n.key)).toEqual([15]);
    expect(tree[1].children).toBeUndefined();
  });

  it('节点标题拼 title 与 code，勾选时能对上权限码', () => {
    const [node] = buildPermissionTree([perm(7, '角色管理', 'RoleManage', 1, 0)]);
    expect(node.title).toBe('角色管理（RoleManage）');
  });

  it('parentId 指向不存在的节点时挂根兜底，节点不丢', () => {
    const tree = buildPermissionTree([perm(99, '孤儿按钮', 'orphan:btn', 3, 42)]);
    expect(tree.map((n) => n.key)).toEqual([99]);
  });

  it('按钮挂在目录而非页面下（种子 delete:product 实况）原样呈现', () => {
    const tree = buildPermissionTree([
      perm(2, '商品管理', 'ProductManage', 0, 0),
      perm(9, '商品列表', 'ProductList', 1, 2),
      perm(11, '删除商品', 'delete:product', 3, 2),
    ]);
    expect(tree[0].children?.map((n) => n.key)).toEqual([9, 11]);
  });
});
