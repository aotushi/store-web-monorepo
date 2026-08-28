import { PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { applyFieldErrors, errorText } from '@/apis/error';
import { useAuthControllerRegister } from '@/apis/generated/auth/auth';
import { useRoleControllerList } from '@/apis/generated/role/role';
import type { EditUserDto, RegisterDto, User } from '@/apis/generated/storeWebAPI.schemas';
import {
  getUserControllerListQueryKey,
  useUserControllerEdit,
  useUserControllerFreezed,
  useUserControllerList,
  useUserControllerRemove,
} from '@/apis/generated/user/user';
import { requireCode } from '@/permission/can';
import { Permission, usePermission } from '@/permission/Permission';

// CRUD 样板页（PLAN §5.6）：列表状态（页码/条数/搜索词）进 URL——刷新/回退/分享链接
// 都能还原视图；默认值不写进 URL 保持整洁。数据流单向：URL search → useQuery → ProTable 受控渲染
const DEFAULT_PAGE_SIZE = 10;

interface UserListSearch {
  page?: number;
  pageSize?: number;
  username?: string;
}

export const Route = createFileRoute('/_authenticated/system/user')({
  validateSearch: (search: Record<string, unknown>): UserListSearch => ({
    page: typeof search.page === 'number' && search.page > 1 ? Math.floor(search.page) : undefined,
    pageSize:
      typeof search.pageSize === 'number' &&
      search.pageSize > 0 &&
      search.pageSize !== DEFAULT_PAGE_SIZE
        ? Math.floor(search.pageSize)
        : undefined,
    username:
      typeof search.username === 'string' && search.username !== '' ? search.username : undefined,
  }),
  beforeLoad: ({ context }) => requireCode(context.me, 'UserManage'),
  component: UserManagePage,
});

function UserManagePage() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { has } = usePermission();

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  const listQuery = useUserControllerList(
    { page, pageSize, username: search.username },
    // 翻页保留上一页数据避免闪空表，刷新态用 isFetching 表达
    { query: { placeholderData: keepPreviousData } },
  );

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getUserControllerListQueryKey() });

  // 搜索表单与 URL 双向同步：提交/重置写 URL；回退/前进（URL 变）回写表单
  const formRef = useRef<ProFormInstance>();
  useEffect(() => {
    formRef.current?.setFieldsValue({ username: search.username });
  }, [search.username]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User>();

  const freezeMutation = useUserControllerFreezed({
    mutation: {
      onSuccess: (updated) => {
        void message.success(updated.freezed ? '已冻结' : '已解冻');
        void invalidateList();
      },
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const removeMutation = useUserControllerRemove({
    mutation: {
      onSuccess: () => {
        void message.success('已删除');
        // 删掉本页最后一条时回退一页，避免停在空页
        if (page > 1 && listQuery.data?.list.length === 1) {
          void navigate({
            search: (prev) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined }),
          });
        }
        void invalidateList();
      },
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const columns: ProColumns<User>[] = [
    { title: 'ID', dataIndex: 'id', width: 64, search: false },
    { title: '用户名', dataIndex: 'username', fieldProps: { placeholder: '用户名模糊搜索' } },
    {
      title: '类型',
      dataIndex: 'userType',
      width: 96,
      search: false,
      valueEnum: { 0: { text: '管理员' }, 1: { text: '普通用户' } },
    },
    { title: '邮箱', dataIndex: 'email', search: false, render: (_, r) => r.email || '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      search: false,
      render: (_, r) =>
        r.roles?.length ? r.roles.map((role) => <Tag key={role.id}>{role.name}</Tag>) : '-',
    },
    {
      title: '状态',
      dataIndex: 'freezed',
      width: 88,
      search: false,
      valueEnum: { 0: { text: '正常', status: 'Success' }, 1: { text: '已冻结', status: 'Error' } },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 168,
      render: (_, record) => {
        // 后端禁自冻/自删（400 兜底），前端同步禁用是体验层
        const isSelf = record.id === me.id;
        return [
          <Button key="edit" type="link" size="small" onClick={() => setEditing(record)}>
            编辑
          </Button>,
          <Permission key="freeze" code="freezed:user">
            <Button
              type="link"
              size="small"
              disabled={isSelf}
              loading={freezeMutation.isPending && freezeMutation.variables?.data.id === record.id}
              onClick={() =>
                freezeMutation.mutate({ data: { id: record.id, freezed: record.freezed ? 0 : 1 } })
              }
            >
              {record.freezed ? '解冻' : '冻结'}
            </Button>
          </Permission>,
          <Permission key="remove" code="delete:user">
            <Popconfirm
              title={`确定删除用户「${record.username}」？`}
              okButtonProps={{ danger: true }}
              disabled={isSelf}
              onConfirm={() => removeMutation.mutate({ id: record.id })}
            >
              <Button type="link" size="small" danger disabled={isSelf}>
                删除
              </Button>
            </Popconfirm>
          </Permission>,
        ];
      },
    },
  ];

  return (
    <PageContainer title="用户管理">
      <ProTable<User, { username?: string }>
        rowKey="id"
        columns={columns}
        dataSource={listQuery.data?.list}
        loading={listQuery.isFetching}
        search={{ labelWidth: 'auto' }}
        formRef={formRef}
        form={{ initialValues: { username: search.username } }}
        // 搜索回第 1 页（省略 page）；pageSize 是布局偏好，搜索/重置都保留
        onSubmit={(values) =>
          void navigate({
            search: (prev) => ({
              pageSize: prev.pageSize,
              username: values.username?.trim() || undefined,
            }),
          })
        }
        onReset={() => void navigate({ search: (prev) => ({ pageSize: prev.pageSize }) })}
        options={false}
        pagination={{
          current: page,
          pageSize,
          total: listQuery.data?.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (nextPage, nextSize) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                // 改每页条数回第 1 页；默认值不进 URL
                page: nextSize !== pageSize ? undefined : nextPage > 1 ? nextPage : undefined,
                pageSize: nextSize !== DEFAULT_PAGE_SIZE ? nextSize : undefined,
              }),
            }),
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建用户
          </Button>,
        ]}
      />
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void invalidateList();
        }}
      />
      <EditUserModal
        user={editing}
        canPickRoles={has('RoleManage')}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          void invalidateList();
        }}
      />
    </PageContainer>
  );
}

function CreateUserModal(props: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form] = Form.useForm<RegisterDto>();
  const { message } = App.useApp();

  const registerMutation = useAuthControllerRegister({
    mutation: {
      onSuccess: (vo) => {
        void message.success(`用户「${vo.username}」已创建`);
        props.onSaved();
      },
      // 双层校验：前端 rules 只是体验层（故意不复刻用户名 32 字上限），
      // 后端 400 字段级数组经 applyFieldErrors 回填到对应字段
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title="新建用户"
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={registerMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) =>
          registerMutation.mutate({
            data: { ...values, email: values.email?.trim() || undefined },
          }),
        );
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="登录用户名" />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, max: 72, message: '密码长度 6-72 位' },
          ]}
        >
          <Input.Password placeholder="6-72 位" />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="选填" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function EditUserModal(props: {
  user?: User;
  canPickRoles: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<Omit<EditUserDto, 'id'>>();
  const { message } = App.useApp();

  // 角色下拉依赖 role/list（后端挂 RoleManage 码）：无码不发请求、隐藏字段；
  // 提交不带 roleIds 即"角色保持不变"（EditUserDto 语义：传入才整体替换）
  const rolesQuery = useRoleControllerList({
    query: { enabled: props.canPickRoles && !!props.user },
  });

  useEffect(() => {
    if (props.user) {
      form.setFieldsValue({
        email: props.user.email || undefined,
        desc: props.user.desc || undefined,
        roleIds: props.user.roles?.map((r) => r.id),
      });
    }
  }, [form, props.user]);

  const editMutation = useUserControllerEdit({
    mutation: {
      onSuccess: () => {
        void message.success('已保存');
        props.onSaved();
      },
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title={props.user ? `编辑用户「${props.user.username}」` : '编辑用户'}
      open={!!props.user}
      onCancel={props.onClose}
      confirmLoading={editMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => {
          if (!props.user) return;
          // 空串归一成 undefined：IsOptional 只豁免 undefined，'' 会被 @IsEmail 拒
          editMutation.mutate({
            data: { ...values, id: props.user.id, email: values.email?.trim() || undefined },
          });
        });
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item name="desc" label="备注" rules={[{ max: 255, message: '备注不能超过 255 字' }]}>
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
        {props.canPickRoles && (
          <Form.Item name="roleIds" label="角色（整体替换）">
            <Select
              mode="multiple"
              placeholder="选择角色"
              loading={rolesQuery.isLoading}
              options={rolesQuery.data?.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
