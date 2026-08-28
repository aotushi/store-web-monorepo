import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { App, Button, Form, Image, Input, InputNumber, Modal, Popconfirm, Upload } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { applyFieldErrors, errorText } from '@/apis/error';
import {
  getProductControllerListQueryKey,
  useProductControllerCreate,
  useProductControllerEdit,
  useProductControllerImportProducts,
  useProductControllerList,
  useProductControllerRemove,
  useProductControllerUpdateStatus,
} from '@/apis/generated/product/product';
import type { CreateProductDto, EditProductDto, Product } from '@/apis/generated/storeWebAPI.schemas';
import { useUploadControllerUploadImage } from '@/apis/generated/upload/upload';
import { ApiError } from '@/apis/mutator';
import { requireCode } from '@/permission/can';
import { Permission } from '@/permission/Permission';

// 复用 CRUD 样板（user 页），本页新点：页面码与操作码分离——进页只需 ProductList，
// 新建/编辑/导入挂 ProductManage、上下架挂 updateStatus:product、删除挂 delete:product，
// 操作列是一行三码的按钮级门控矩阵；另有图片上传自定义控件与 excel 导入行级错误呈现
const DEFAULT_PAGE_SIZE = 10;

const STATUS_ENUM = {
  0: { text: '未上架', status: 'Default' },
  1: { text: '已上架', status: 'Success' },
  2: { text: '已下架', status: 'Warning' },
} as const;

interface ProductListSearch {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: 0 | 1 | 2;
}

// 状态枚举含 0：一律与 undefined 显式区分，不能用 falsy（会把"未上架"当成没筛选）。
// URL 层进来是 number、表单 valueEnum 层是 string，两个来源都在这收口成 0|1|2 字面量
function parseStatus(v: unknown): 0 | 1 | 2 | undefined {
  const n = typeof v === 'string' && v !== '' ? Number(v) : v;
  return n === 0 || n === 1 || n === 2 ? n : undefined;
}

export const Route = createFileRoute('/_authenticated/product/')({
  validateSearch: (search: Record<string, unknown>): ProductListSearch => ({
    page: typeof search.page === 'number' && search.page > 1 ? Math.floor(search.page) : undefined,
    pageSize:
      typeof search.pageSize === 'number' &&
      search.pageSize > 0 &&
      search.pageSize !== DEFAULT_PAGE_SIZE
        ? Math.floor(search.pageSize)
        : undefined,
    name: typeof search.name === 'string' && search.name !== '' ? search.name : undefined,
    status: parseStatus(search.status),
  }),
  beforeLoad: ({ context }) => requireCode(context.me, 'ProductList'),
  component: ProductListPage,
});

function ProductListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  const listQuery = useProductControllerList(
    { page, pageSize, name: search.name, status: search.status },
    { query: { placeholderData: keepPreviousData } },
  );

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getProductControllerListQueryKey() });

  // URL → 搜索表单回填；status 在表单层是 valueEnum 的字符串 key，进出各转一次
  const formRef = useRef<ProFormInstance>();
  useEffect(() => {
    formRef.current?.setFieldsValue({
      name: search.name,
      status: search.status !== undefined ? String(search.status) : undefined,
    });
  }, [search.name, search.status]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product>();

  const statusMutation = useProductControllerUpdateStatus({
    mutation: {
      onSuccess: (updated) => {
        void message.success(updated.status === 1 ? '已上架' : '已下架');
        void invalidateList();
      },
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const removeMutation = useProductControllerRemove({
    mutation: {
      onSuccess: () => {
        void message.success('已删除');
        if (page > 1 && listQuery.data?.list.length === 1) {
          void navigate({
            search: (prev) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined }),
          });
        }
        void invalidateList();
      },
      // 被订单/活动引用时后端 400 拒删，detail 是字符串走 toast
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const importMutation = useProductControllerImportProducts({
    mutation: {
      onSuccess: (vo) => {
        void message.success(`已导入 ${vo.imported} 条商品`);
        void invalidateList();
      },
      // 行级错误 detail 形状是 [{row, errors[]}]（与字段级 [{field, errors[]}] 同风格不同键），
      // 表单回填无从谈起，改用对话框逐行呈现；表头不符等 detail 是字符串走 toast
      onError: (err) => {
        const rowErrors = pickRowErrors(err);
        if (rowErrors) {
          modal.error({
            title: '导入失败，请修正后重新上传（本次未入库）',
            content: (
              <ul style={{ paddingLeft: 20, maxHeight: 320, overflow: 'auto' }}>
                {rowErrors.map((r) => (
                  <li key={r.row}>
                    第 {r.row} 行：{r.errors.join('；')}
                  </li>
                ))}
              </ul>
            ),
          });
        } else {
          void message.error(errorText(err));
        }
      },
    },
  });

  const columns: ProColumns<Product>[] = [
    { title: 'ID', dataIndex: 'id', width: 64, search: false },
    {
      title: '图片',
      dataIndex: 'images',
      width: 72,
      search: false,
      render: (_, r) =>
        r.images ? (
          <Image src={r.images} width={48} height={48} style={{ objectFit: 'cover' }} />
        ) : (
          '-'
        ),
    },
    { title: '名称', dataIndex: 'name', fieldProps: { placeholder: '商品名称模糊搜索' } },
    { title: '描述', dataIndex: 'desc', ellipsis: true, search: false },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      search: false,
      render: (_, r) => `¥${r.price.toFixed(2)}`,
    },
    { title: '状态', dataIndex: 'status', width: 96, valueEnum: STATUS_ENUM },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 168,
      render: (_, record) => [
        // 编辑接口挂 ProductManage 而页面码是 ProductList——仅有页面码的账号按钮不可见
        <Permission key="edit" code="ProductManage">
          <Button type="link" size="small" onClick={() => setEditing(record)}>
            编辑
          </Button>
        </Permission>,
        <Permission key="status" code="updateStatus:product">
          <Button
            type="link"
            size="small"
            loading={statusMutation.isPending && statusMutation.variables?.data.id === record.id}
            onClick={() =>
              statusMutation.mutate({
                data: { id: record.id, status: record.status === 1 ? 2 : 1 },
              })
            }
          >
            {record.status === 1 ? '下架' : '上架'}
          </Button>
        </Permission>,
        <Permission key="remove" code="delete:product">
          <Popconfirm
            title={`确定删除商品「${record.name}」？`}
            okButtonProps={{ danger: true }}
            onConfirm={() => removeMutation.mutate({ id: record.id })}
          >
            <Button
              type="link"
              size="small"
              danger
              loading={removeMutation.isPending && removeMutation.variables?.id === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Permission>,
      ],
    },
  ];

  return (
    <PageContainer title="商品列表">
      <ProTable<Product, { name?: string; status?: string }>
        rowKey="id"
        columns={columns}
        dataSource={listQuery.data?.list}
        loading={listQuery.isFetching}
        search={{ labelWidth: 'auto' }}
        formRef={formRef}
        form={{
          initialValues: {
            name: search.name,
            status: search.status !== undefined ? String(search.status) : undefined,
          },
        }}
        onSubmit={(values) =>
          void navigate({
            search: (prev) => ({
              pageSize: prev.pageSize,
              name: values.name?.trim() || undefined,
              status: parseStatus(values.status),
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
                page: nextSize !== pageSize ? undefined : nextPage > 1 ? nextPage : undefined,
                pageSize: nextSize !== DEFAULT_PAGE_SIZE ? nextSize : undefined,
              }),
            }),
        }}
        toolBarRender={() => [
          <Permission key="import" code="ProductManage">
            <Upload
              accept=".xlsx"
              showUploadList={false}
              customRequest={({ file }) => importMutation.mutate({ data: { file: file as File } })}
            >
              <Button icon={<UploadOutlined />} loading={importMutation.isPending}>
                excel 导入
              </Button>
            </Upload>
          </Permission>,
          <Permission key="create" code="ProductManage">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建商品
            </Button>
          </Permission>,
        ]}
      />
      <CreateProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void invalidateList();
        }}
      />
      <EditProductModal
        product={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          void invalidateList();
        }}
      />
    </PageContainer>
  );
}

// excel 导入的行级 400：detail 为 [{row, errors[]}] 时返回它，其余形状返回 null
function pickRowErrors(err: unknown): { row: number; errors: string[] }[] | null {
  if (!(err instanceof ApiError) || !Array.isArray(err.detail)) return null;
  const items = err.detail as unknown[];
  const ok = items.every(
    (it) =>
      typeof it === 'object' &&
      it !== null &&
      typeof (it as { row?: unknown }).row === 'number' &&
      Array.isArray((it as { errors?: unknown }).errors),
  );
  return ok && items.length ? (items as { row: number; errors: string[] }[]) : null;
}

// 图片上传自定义表单控件（value/onChange 约定，同 PermissionTreeField）：
// value 即商品 images 字段的 URL；移除写空串而非 undefined——antd 表单字段值 undefined
// 时提交体里键会消失，后端 PATCH"不传即不改"会让"删图"静默变成"没改"
function ImageUploadField(props: { value?: string; onChange?: (v: string) => void }) {
  const { message } = App.useApp();
  const uploadMutation = useUploadControllerUploadImage({
    mutation: {
      onSuccess: (vo) => props.onChange?.(vo.url),
      onError: (err) => void message.error(errorText(err)),
    },
  });

  if (props.value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Image src={props.value} width={96} height={96} style={{ objectFit: 'cover' }} />
        <Button size="small" onClick={() => props.onChange?.('')}>
          移除
        </Button>
      </div>
    );
  }
  return (
    <Upload
      accept="image/jpeg,image/png,image/webp,image/gif"
      showUploadList={false}
      // 前端预检是体验层，后端 fileFilter/2MB 限制兜底
      beforeUpload={(file) => {
        if (file.size > 2 * 1024 * 1024) {
          void message.error('图片不能超过 2MB');
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={({ file }) => uploadMutation.mutate({ data: { file: file as File } })}
    >
      <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
        上传图片
      </Button>
    </Upload>
  );
}

// 创建不放 status：新品默认未上架，上下架是列表页专用操作（贴后端接口分工）
function CreateProductModal(props: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form] = Form.useForm<CreateProductDto>();
  const { message } = App.useApp();

  const createMutation = useProductControllerCreate({
    mutation: {
      onSuccess: (product) => {
        void message.success(`商品「${product.name}」已创建`);
        props.onSaved();
      },
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title="新建商品"
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={createMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => createMutation.mutate({ data: values }));
      }}
    >
      <Form form={form} layout="vertical">
        <ProductFormItems />
      </Form>
    </Modal>
  );
}

function EditProductModal(props: { product?: Product; onClose: () => void; onSaved: () => void }) {
  const [form] = Form.useForm<Omit<EditProductDto, 'id'>>();
  const { message } = App.useApp();

  useEffect(() => {
    if (props.product) {
      form.setFieldsValue({
        name: props.product.name,
        desc: props.product.desc,
        price: props.product.price,
        images: props.product.images ?? '',
      });
    }
  }, [form, props.product]);

  const editMutation = useProductControllerEdit({
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
      title={props.product ? `编辑商品「${props.product.name}」` : '编辑商品'}
      open={!!props.product}
      onCancel={props.onClose}
      confirmLoading={editMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => {
          if (!props.product) return;
          editMutation.mutate({ data: { ...values, id: props.product.id } });
        });
      }}
    >
      <Form form={form} layout="vertical">
        <ProductFormItems />
      </Form>
    </Modal>
  );
}

// 新建/编辑共用字段（上传接口与弹窗入口同挂 ProductManage，字段内无需再门控）
function ProductFormItems() {
  return (
    <>
      <Form.Item
        name="name"
        label="名称"
        rules={[
          { required: true, message: '请输入商品名称' },
          { max: 50, message: '名称不能超过 50 字' },
        ]}
      >
        <Input placeholder="商品名称" />
      </Form.Item>
      <Form.Item name="desc" label="描述" rules={[{ required: true, message: '请输入商品描述' }]}>
        <Input.TextArea rows={2} placeholder="商品描述" />
      </Form.Item>
      <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
        <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
      </Form.Item>
      <Form.Item name="images" label="图片">
        <ImageUploadField />
      </Form.Item>
    </>
  );
}
