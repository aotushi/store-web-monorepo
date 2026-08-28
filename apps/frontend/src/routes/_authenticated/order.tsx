import { PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Tag,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { applyFieldErrors, errorText } from '@/apis/error';
import {
  getOrderControllerListQueryKey,
  useOrderControllerCreate,
  useOrderControllerDetail,
  useOrderControllerList,
  useOrderControllerRemove,
  useOrderControllerUpdateOrder,
} from '@/apis/generated/order/order';
import { useProductControllerList } from '@/apis/generated/product/product';
import type { CreateOrderDto, Order } from '@/apis/generated/storeWebAPI.schemas';
import { requireCode } from '@/permission/can';
import { Permission } from '@/permission/Permission';

// 复用 CRUD 样板（product 页），本页新点：三码形态——订单无独立页面码，
// OrderManage 一码兼页面 + 下单 + 列表 + 详情（码的粒度由后端 RequirePermission 决定，
// 与商品页四码矩阵成对比），状态流转挂 cancel:order、删除挂 delete:order；
// 另有状态机按钮条件渲染（0→1/0→2/1→2，取消终态）与详情抽屉的下单快照对比
const DEFAULT_PAGE_SIZE = 10;

const STATUS_ENUM = {
  0: { text: '未付款', status: 'Warning' },
  1: { text: '已付款', status: 'Success' },
  2: { text: '已取消', status: 'Default' },
} as const;

interface OrderListSearch {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: 0 | 1 | 2;
}

// 状态枚举含 0：与 undefined 显式区分，URL 层 number、表单 valueEnum 层 string 都在这收口（同 product 页）
function parseStatus(v: unknown): 0 | 1 | 2 | undefined {
  const n = typeof v === 'string' && v !== '' ? Number(v) : v;
  return n === 0 || n === 1 || n === 2 ? n : undefined;
}

// 金额乘法走整数分位避免浮点误差，算法同后端 moneyMul；仅弹窗预览用，权威金额始终后端算
function moneyMul(a: number, b: number): number {
  return Math.round(a * b * 100) / 100;
}

export const Route = createFileRoute('/_authenticated/order')({
  validateSearch: (search: Record<string, unknown>): OrderListSearch => ({
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
  beforeLoad: ({ context }) => requireCode(context.me, 'OrderManage'),
  component: OrderListPage,
});

function OrderListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  const listQuery = useOrderControllerList(
    { page, pageSize, name: search.name, status: search.status },
    { query: { placeholderData: keepPreviousData } },
  );

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getOrderControllerListQueryKey() });

  // URL → 搜索表单回填；status 在表单层是 valueEnum 的字符串 key，进出各转一次
  const formRef = useRef<ProFormInstance>();
  useEffect(() => {
    formRef.current?.setFieldsValue({
      name: search.name,
      status: search.status !== undefined ? String(search.status) : undefined,
    });
  }, [search.name, search.status]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number>();

  // 付款与取消同一接口同一权限码（cancel:order），按目标状态给反馈文案
  const updateMutation = useOrderControllerUpdateOrder({
    mutation: {
      onSuccess: (updated) => {
        void message.success(updated.status === 1 ? '已付款' : '已取消');
        void invalidateList();
      },
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const removeMutation = useOrderControllerRemove({
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
      onError: (err) => void message.error(errorText(err)),
    },
  });

  const columns: ProColumns<Order>[] = [
    { title: 'ID', dataIndex: 'id', width: 64, search: false },
    { title: '商品名称', dataIndex: 'name', fieldProps: { placeholder: '商品名称模糊搜索' } },
    { title: '数量', dataIndex: 'count', width: 64, search: false },
    {
      title: '订单价格',
      dataIndex: 'price',
      width: 100,
      search: false,
      render: (_, r) => `¥${r.price.toFixed(2)}`,
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      width: 72,
      search: false,
      render: (_, r) => (r.discount === 1 ? '-' : r.discount.toFixed(2)),
    },
    {
      title: '折后价',
      dataIndex: 'discountPrice',
      width: 100,
      search: false,
      render: (_, r) => `¥${r.discountPrice.toFixed(2)}`,
    },
    { title: '状态', dataIndex: 'status', width: 90, valueEnum: STATUS_ENUM },
    { title: '操作员', dataIndex: 'operator', width: 100, search: false },
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
      width: 200,
      render: (_, record) => [
        // 详情接口码即页面码 OrderManage，进得来页就点得动，无需再门控
        <Button key="detail" type="link" size="small" onClick={() => setDetailId(record.id)}>
          详情
        </Button>,
        // 状态机按钮条件渲染：0 可付款/取消，1 只可取消，2 终态两者皆无
        record.status === 0 && (
          <Permission key="pay" code="cancel:order">
            <Popconfirm
              title={`确认订单「${record.name}」已付款？`}
              onConfirm={() => updateMutation.mutate({ data: { id: record.id, status: 1 } })}
            >
              <Button
                type="link"
                size="small"
                loading={
                  updateMutation.isPending &&
                  updateMutation.variables?.data.id === record.id &&
                  updateMutation.variables?.data.status === 1
                }
              >
                付款
              </Button>
            </Popconfirm>
          </Permission>
        ),
        record.status !== 2 && (
          <Permission key="cancel" code="cancel:order">
            <Popconfirm
              title={`确定取消订单「${record.name}」？取消后不可恢复`}
              okButtonProps={{ danger: true }}
              onConfirm={() => updateMutation.mutate({ data: { id: record.id, status: 2 } })}
            >
              <Button
                type="link"
                size="small"
                loading={
                  updateMutation.isPending &&
                  updateMutation.variables?.data.id === record.id &&
                  updateMutation.variables?.data.status === 2
                }
              >
                取消
              </Button>
            </Popconfirm>
          </Permission>
        ),
        <Permission key="remove" code="delete:order">
          <Popconfirm
            title={`确定删除订单「${record.name}」？`}
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
    <PageContainer title="订单管理">
      <ProTable<Order, { name?: string; status?: string }>
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
          // 下单接口码即页面码 OrderManage：进得来页就建得了单，不再包 Permission（三码形态的体现）
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建订单
          </Button>,
        ]}
      />
      <CreateOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void invalidateList();
        }}
      />
      <OrderDetailDrawer id={detailId} onClose={() => setDetailId(undefined)} />
    </PageContainer>
  );
}

// 详情抽屉：订单字段 + 关联商品现状。订单存的是下单快照（名称/单价×数量），
// 商品后来调价不回写订单——把商品当前价并列出来，快照语义肉眼可验
function OrderDetailDrawer(props: { id?: number; onClose: () => void }) {
  // id 为 undefined 时传 0，生成 hook 的 enabled: !!(id) 自动禁用查询
  const detailQuery = useOrderControllerDetail(props.id ?? 0);
  const order = detailQuery.data;

  return (
    <Drawer
      title={props.id !== undefined ? `订单详情 #${props.id}` : '订单详情'}
      open={props.id !== undefined}
      onClose={props.onClose}
      width={480}
      loading={detailQuery.isLoading}
    >
      {order && (
        <>
          <Descriptions title="订单信息" column={1} size="small" bordered>
            <Descriptions.Item label="商品名称（下单快照）">{order.name}</Descriptions.Item>
            <Descriptions.Item label="数量">{order.count}</Descriptions.Item>
            <Descriptions.Item label="订单价格">¥{order.price.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="折扣">
              {order.discount === 1 ? '未打折' : order.discount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="折后价">¥{order.discountPrice.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {STATUS_ENUM[order.status as 0 | 1 | 2]?.text ?? order.status}
            </Descriptions.Item>
            <Descriptions.Item label="操作员">{order.operator}</Descriptions.Item>
            <Descriptions.Item label="备注">{order.desc || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(order.createTime).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
          <Descriptions
            title="关联商品（当前状态）"
            column={1}
            size="small"
            bordered
            style={{ marginTop: 24 }}
          >
            {order.product ? (
              <>
                <Descriptions.Item label="名称">{order.product.name}</Descriptions.Item>
                <Descriptions.Item label="当前单价">
                  ¥{order.product.price.toFixed(2)}
                  {/* 快照对比：当前单价 × 数量 ≠ 订单价格 ⇒ 下单后调过价 */}
                  {moneyMul(order.product.price, order.count) !== order.price && (
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      与下单时不同
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  {order.product.status === 1 ? '已上架' : order.product.status === 2 ? '已下架' : '未上架'}
                </Descriptions.Item>
              </>
            ) : (
              <Descriptions.Item label="商品">
                <Tag>商品已删除</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}
    </Drawer>
  );
}

// 下单弹窗：商品只列已上架（后端"未上架不可下单"的前端防线），金额前端只做预览，
// 权威值由后端按商品价快照计算（防篡改：请求体里根本没有金额字段）
function CreateOrderModal(props: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form] = Form.useForm<CreateOrderDto>();
  const { message } = App.useApp();

  // pageSize 上限 100（后端 PaginationDto @Max）；商品超百须换搜索式选择器，当前体量够用
  const productsQuery = useProductControllerList(
    { page: 1, pageSize: 100, status: 1 },
    { query: { enabled: props.open } },
  );
  const products = productsQuery.data?.list ?? [];

  const productId = Form.useWatch('productId', form);
  const count = Form.useWatch('count', form);
  const discount = Form.useWatch('discount', form);
  const selected = products.find((p) => p.id === productId);
  const previewPrice =
    selected && typeof count === 'number' ? moneyMul(selected.price, count) : undefined;

  const createMutation = useOrderControllerCreate({
    mutation: {
      onSuccess: (order) => {
        void message.success(`订单「${order.name}」已创建`);
        props.onSaved();
      },
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title="新建订单"
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={createMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) =>
          createMutation.mutate({
            data: {
              productId: values.productId,
              count: values.count,
              discount: values.discount ?? undefined,
              desc: values.desc?.trim() || undefined,
            },
          }),
        );
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ count: 1 }}>
        <Form.Item
          name="productId"
          label="商品（仅已上架）"
          rules={[{ required: true, message: '请选择商品' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={productsQuery.isLoading}
            placeholder="选择商品"
            options={products.map((p) => ({
              label: `${p.name}（¥${p.price.toFixed(2)}）`,
              value: p.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="count" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="discount" label="折扣（0.01~1，不填即不打折）">
          <InputNumber min={0.01} max={1} step={0.01} style={{ width: '100%' }} placeholder="1.00" />
        </Form.Item>
        <Form.Item name="desc" label="备注">
          <Input.TextArea rows={2} placeholder="订单备注（可选）" />
        </Form.Item>
        {previewPrice !== undefined && (
          <div style={{ color: 'rgba(0,0,0,0.65)' }}>
            金额预览：¥{previewPrice.toFixed(2)}
            {typeof discount === 'number' && discount < 1 && (
              <>，折后 ¥{moneyMul(previewPrice, discount).toFixed(2)}</>
            )}
            （以后端按商品快照计算为准）
          </div>
        )}
      </Form>
    </Modal>
  );
}
