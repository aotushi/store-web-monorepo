import { PlusOutlined } from "@ant-design/icons";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { App, Button, Form, Input, Modal, Popconfirm, Spin, Tag, Tree } from "antd";
import { useEffect, useMemo, useState } from "react";
import { applyFieldErrors, errorText } from "@/apis/error";
import { usePermissionControllerList } from "@/apis/generated/permission/permission";
import {
  getRoleControllerListQueryKey,
  useRoleControllerCreate,
  useRoleControllerEdit,
  useRoleControllerList,
  useRoleControllerRemove,
} from "@/apis/generated/role/role";
import type { CreateRoleDto, EditRoleDto, Role } from "@/apis/generated/storeWebAPI.schemas";
import { requireCode } from "@/permission/can";
import { Permission, usePermission } from "@/permission/Permission";
import { buildPermissionTree } from "@/permission/tree";

// 复用用户页 CRUD 样板，但 role/list 无分页无筛选——接口没有的能力不硬造 URL 状态。
// 本页新增交互：权限点勾选树（checkStrictly 精确授权，见 PermissionTreeField）
export const Route = createFileRoute("/_authenticated/system/role")({
  beforeLoad: ({ context }) => requireCode(context.me, "RoleManage"),
  component: RoleManagePage,
});

function RoleManagePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { has } = usePermission();
  // 权限树数据源 permission/list 后端挂 PermissionManage 码：无码不渲染字段、不发请求；
  // 提交不带 permissionIds 即"权限点保持不变"（EditRoleDto 语义：传入才整体替换）
  const canPickPermissions = has("PermissionManage");

  const listQuery = useRoleControllerList();
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getRoleControllerListQueryKey() });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Role>();

  const removeMutation = useRoleControllerRemove({
    mutation: {
      onSuccess: () => {
        void message.success("已删除");
        void invalidateList();
      },
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const columns: ProColumns<Role>[] = [
    { title: "ID", dataIndex: "id", width: 64 },
    { title: "名称", dataIndex: "name", width: 140 },
    { title: "描述", dataIndex: "desc", ellipsis: true },
    {
      title: "权限点",
      dataIndex: "permissions",
      width: 88,
      render: (_, r) => `${r.permissions?.length ?? 0} 个`,
    },
    {
      title: "内置",
      dataIndex: "isSystem",
      width: 80,
      render: (_, r) => (r.isSystem === 1 ? <Tag color="blue">内置</Tag> : "-"),
    },
    { title: "创建时间", dataIndex: "createTime", valueType: "dateTime", width: 170 },
    {
      title: "操作",
      valueType: "option",
      width: 120,
      render: (_, record) => {
        // 内置角色后端禁删（400 兜底），允许编辑（含权限点调整）
        const isSystem = record.isSystem === 1;
        return [
          <Button key="edit" type="link" size="small" onClick={() => setEditing(record)}>
            编辑
          </Button>,
          <Permission key="remove" code="delete:role">
            <Popconfirm
              title={`确定删除角色「${record.name}」？`}
              description="使用中的用户将失去该角色"
              okButtonProps={{ danger: true }}
              disabled={isSystem}
              onConfirm={() => removeMutation.mutate({ id: record.id })}
            >
              <Button
                type="link"
                size="small"
                danger
                disabled={isSystem}
                loading={removeMutation.isPending && removeMutation.variables?.id === record.id}
              >
                删除
              </Button>
            </Popconfirm>
          </Permission>,
        ];
      },
    },
  ];

  return (
    <PageContainer title="角色管理">
      <ProTable<Role>
        rowKey="id"
        columns={columns}
        dataSource={listQuery.data}
        loading={listQuery.isFetching}
        search={false}
        options={false}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建角色
          </Button>,
        ]}
      />
      <CreateRoleModal
        open={createOpen}
        canPickPermissions={canPickPermissions}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void invalidateList();
        }}
      />
      <EditRoleModal
        role={editing}
        canPickPermissions={canPickPermissions}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          void invalidateList();
        }}
      />
    </PageContainer>
  );
}

// antd 自定义表单控件约定：接收 value/onChange 即可挂进 Form.Item。
// checkStrictly（勾选父子不联动）是刻意的：权限授予是精确 id 集合，种子数据实锤存在
// "挂页面码不挂按钮码"“按钮挂目录下”的配置，父子联动会在保存时篡改这类集合
function PermissionTreeField(props: { value?: number[]; onChange?: (v: number[]) => void }) {
  const permsQuery = usePermissionControllerList();
  const treeData = useMemo(() => buildPermissionTree(permsQuery.data ?? []), [permsQuery.data]);

  // 数据就绪后才挂 Tree：defaultExpandAll 只在首次挂载时生效，异步数据到达后不会补展开
  if (!permsQuery.data) return <Spin size="small" />;
  return (
    <div style={{ maxHeight: 320, overflow: "auto" }}>
      <Tree
        checkable
        checkStrictly
        defaultExpandAll
        selectable={false}
        treeData={treeData}
        checkedKeys={props.value ?? []}
        onCheck={(checked) =>
          props.onChange?.((Array.isArray(checked) ? checked : checked.checked) as number[])
        }
      />
    </div>
  );
}

function CreateRoleModal(props: {
  open: boolean;
  canPickPermissions: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<CreateRoleDto>();
  const { message } = App.useApp();

  const createMutation = useRoleControllerCreate({
    mutation: {
      onSuccess: (role) => {
        void message.success(`角色「${role.name}」已创建`);
        props.onSaved();
      },
      // 字段级 400 回填表单，非字段级（409 重名等）toast
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title="新建角色"
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={createMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => createMutation.mutate({ data: values }));
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, message: "请输入角色名称" },
            { max: 50, message: "名称不能超过 50 字" },
          ]}
        >
          <Input placeholder="角色名称" />
        </Form.Item>
        <Form.Item
          name="desc"
          label="描述"
          rules={[
            { required: true, message: "请输入角色描述" },
            { max: 255, message: "描述不能超过 255 字" },
          ]}
        >
          <Input.TextArea rows={2} placeholder="角色职责说明" />
        </Form.Item>
        {props.canPickPermissions && (
          <Form.Item name="permissionIds" label="权限点">
            <PermissionTreeField />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function EditRoleModal(props: {
  role?: Role;
  canPickPermissions: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<Omit<EditRoleDto, "id">>();
  const { message } = App.useApp();

  useEffect(() => {
    if (props.role) {
      form.setFieldsValue({
        name: props.role.name,
        desc: props.role.desc,
        // 无 PermissionManage 码时不塞初值：字段未挂载，提交自然不带 → 权限点不动
        ...(props.canPickPermissions
          ? { permissionIds: props.role.permissions?.map((p) => p.id) ?? [] }
          : {}),
      });
    }
  }, [form, props.role, props.canPickPermissions]);

  const editMutation = useRoleControllerEdit({
    mutation: {
      onSuccess: () => {
        void message.success("已保存");
        props.onSaved();
      },
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title={props.role ? `编辑角色「${props.role.name}」` : "编辑角色"}
      open={!!props.role}
      onCancel={props.onClose}
      confirmLoading={editMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => {
          if (!props.role) return;
          editMutation.mutate({ data: { ...values, id: props.role.id } });
        });
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, message: "请输入角色名称" },
            { max: 50, message: "名称不能超过 50 字" },
          ]}
        >
          <Input placeholder="角色名称" />
        </Form.Item>
        <Form.Item
          name="desc"
          label="描述"
          rules={[
            { required: true, message: "请输入角色描述" },
            { max: 255, message: "描述不能超过 255 字" },
          ]}
        >
          <Input.TextArea rows={2} placeholder="角色职责说明" />
        </Form.Item>
        {props.canPickPermissions && (
          <Form.Item name="permissionIds" label="权限点（整体替换）">
            <PermissionTreeField />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
