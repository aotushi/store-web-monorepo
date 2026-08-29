import { PlusOutlined } from "@ant-design/icons";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import type { ProColumns, ProFormInstance } from "@ant-design/pro-components";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Tag } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { applyFieldErrors, errorText } from "@/apis/error";
import {
  getActivityControllerListQueryKey,
  useActivityControllerCreate,
  useActivityControllerEdit,
  useActivityControllerList,
  useActivityControllerRemove,
} from "@/apis/generated/activity/activity";
import { useProductControllerList } from "@/apis/generated/product/product";
import type { Activity, Product } from "@/apis/generated/storeWebAPI.schemas";
import { requireCode } from "@/permission/can";
import { Permission } from "@/permission/Permission";

// 复用 CRUD 样板（order 页），本页新点：两码形态——ActivityManage 兼页面 + 创建 + 列表 + 编辑，
// 仅删除另设 delete:activity（门控分布抄后端 @RequirePermission）；状态不是用户操作而是
// 时间窗推导的落库快照（创建/编辑重推 + 定时对账），前端只读呈现；时间窗用 RangePicker
// 一控件管 startTime/endTime 两字段，提交拆 ISO、回显组 dayjs
const DEFAULT_PAGE_SIZE = 10;

const STATUS_ENUM = {
  0: { text: "未开始", status: "Warning" },
  1: { text: "进行中", status: "Processing" },
  2: { text: "已结束", status: "Default" },
} as const;

const TYPE_TEXT: Record<number, string> = { 0: "普通活动", 1: "拼团活动" };

interface ActivityListSearch {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: 0 | 1 | 2;
}

// 状态枚举含 0：与 undefined 显式区分，URL 层 number、表单 valueEnum 层 string 都在这收口（同 product/order 页）
function parseStatus(v: unknown): 0 | 1 | 2 | undefined {
  const n = typeof v === "string" && v !== "" ? Number(v) : v;
  return n === 0 || n === 1 || n === 2 ? n : undefined;
}

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: (search: Record<string, unknown>): ActivityListSearch => ({
    page: typeof search.page === "number" && search.page > 1 ? Math.floor(search.page) : undefined,
    pageSize:
      typeof search.pageSize === "number" &&
      search.pageSize > 0 &&
      search.pageSize !== DEFAULT_PAGE_SIZE
        ? Math.floor(search.pageSize)
        : undefined,
    name: typeof search.name === "string" && search.name !== "" ? search.name : undefined,
    status: parseStatus(search.status),
  }),
  beforeLoad: ({ context }) => requireCode(context.me, "ActivityManage"),
  component: ActivityListPage,
});

function ActivityListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  const listQuery = useActivityControllerList(
    { page, pageSize, name: search.name, status: search.status },
    { query: { placeholderData: keepPreviousData } },
  );

  // 列表 VO 只有 productId 不组装商品名；创建/编辑弹窗本就要全量商品做下拉，
  // 同一份数据顺带把列里的 id 映射成名称（活动可挂未上架商品——后端只校验存在性，口径与订单不同）
  const productsQuery = useProductControllerList({ page: 1, pageSize: 100 });
  const products = productsQuery.data?.list ?? [];
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getActivityControllerListQueryKey() });

  // URL → 搜索表单回填；status 在表单层是 valueEnum 的字符串 key，进出各转一次
  const formRef = useRef<ProFormInstance>();
  useEffect(() => {
    formRef.current?.setFieldsValue({
      name: search.name,
      status: search.status !== undefined ? String(search.status) : undefined,
    });
  }, [search.name, search.status]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Activity>();

  const removeMutation = useActivityControllerRemove({
    mutation: {
      onSuccess: () => {
        void message.success("已删除");
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

  const columns: ProColumns<Activity>[] = [
    { title: "ID", dataIndex: "id", width: 64, search: false },
    { title: "名称", dataIndex: "name", fieldProps: { placeholder: "活动名称模糊搜索" } },
    {
      title: "类型",
      dataIndex: "type",
      width: 96,
      search: false,
      render: (_, r) => (
        <Tag color={r.type === 1 ? "blue" : "default"}>{TYPE_TEXT[r.type] ?? r.type}</Tag>
      ),
    },
    { title: "状态", dataIndex: "status", width: 90, valueEnum: STATUS_ENUM },
    {
      title: "关联商品",
      dataIndex: "productId",
      width: 120,
      search: false,
      ellipsis: true,
      render: (_, r) => productName(r.productId),
    },
    {
      title: "开始时间",
      dataIndex: "startTime",
      valueType: "dateTime",
      width: 160,
      search: false,
    },
    { title: "结束时间", dataIndex: "endTime", valueType: "dateTime", width: 160, search: false },
    {
      title: "操作",
      valueType: "option",
      width: 120,
      render: (_, record) => [
        // 编辑接口码即页面码 ActivityManage，进得来页就点得动，无需再门控
        <Button key="edit" type="link" size="small" onClick={() => setEditing(record)}>
          编辑
        </Button>,
        <Permission key="remove" code="delete:activity">
          <Popconfirm
            title={`确定删除活动「${record.name}」？`}
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
    <PageContainer title="活动管理">
      <ProTable<Activity, { name?: string; status?: string }>
        rowKey="id"
        columns={columns}
        dataSource={listQuery.data?.list}
        loading={listQuery.isFetching}
        search={{ labelWidth: "auto" }}
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
          // 创建接口码即页面码 ActivityManage，不再包 Permission（两码形态的体现）
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建活动
          </Button>,
        ]}
      />
      <CreateActivityModal
        open={createOpen}
        products={products}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void invalidateList();
        }}
      />
      <EditActivityModal
        activity={editing}
        products={products}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          void invalidateList();
        }}
      />
    </PageContainer>
  );
}

// 弹窗表单值：时间窗在表单层是 RangePicker 的 dayjs 数组，提交层拆成两个 ISO 字段
interface ActivityFormValues {
  name: string;
  type: 0 | 1;
  desc?: string;
  range: [Dayjs, Dayjs];
  productId: number;
}

function CreateActivityModal(props: {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<ActivityFormValues>();
  const { message } = App.useApp();

  const createMutation = useActivityControllerCreate({
    mutation: {
      onSuccess: (activity) => {
        void message.success(`活动「${activity.name}」已创建`);
        props.onSaved();
      },
      // 时间窗 400（"结束时间必须晚于开始时间"）detail 是字符串，走 toast 不回填
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title="新建活动"
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={createMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) =>
          createMutation.mutate({
            data: {
              name: values.name,
              type: values.type,
              desc: values.desc?.trim() || undefined,
              startTime: values.range[0].toISOString(),
              endTime: values.range[1].toISOString(),
              productId: values.productId,
            },
          }),
        );
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ type: 0 }}>
        <ActivityFormItems products={props.products} />
      </Form>
    </Modal>
  );
}

function EditActivityModal(props: {
  activity?: Activity;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<ActivityFormValues>();
  const { message } = App.useApp();

  useEffect(() => {
    if (props.activity) {
      form.setFieldsValue({
        name: props.activity.name,
        // 实体侧 type 反射成宽 number，DTO 侧是 0|1 字面量，回显处收窄
        type: props.activity.type === 1 ? 1 : 0,
        desc: props.activity.desc,
        range: [dayjs(props.activity.startTime), dayjs(props.activity.endTime)],
        productId: props.activity.productId,
      });
    }
  }, [form, props.activity]);

  const editMutation = useActivityControllerEdit({
    mutation: {
      onSuccess: (activity) => {
        // 时间窗变更会在后端重推状态，反馈里带上推导结果
        void message.success(`已保存（${STATUS_ENUM[activity.status as 0 | 1 | 2]?.text ?? ""}）`);
        props.onSaved();
      },
      onError: (err) => {
        if (!applyFieldErrors(form, err)) void message.error(errorText(err));
      },
    },
  });

  return (
    <Modal
      title={props.activity ? `编辑活动「${props.activity.name}」` : "编辑活动"}
      open={!!props.activity}
      onCancel={props.onClose}
      confirmLoading={editMutation.isPending}
      afterClose={() => form.resetFields()}
      onOk={() => {
        void form.validateFields().then((values) => {
          if (!props.activity) return;
          editMutation.mutate({
            data: {
              id: props.activity.id,
              name: values.name,
              type: values.type,
              desc: values.desc?.trim() || undefined,
              startTime: values.range[0].toISOString(),
              endTime: values.range[1].toISOString(),
              productId: values.productId,
            },
          });
        });
      }}
    >
      <Form form={form} layout="vertical">
        <ActivityFormItems products={props.products} />
      </Form>
    </Modal>
  );
}

// 新建/编辑共用字段；商品下拉列全量（含未上架）——后端 create/edit 只校验商品存在性
function ActivityFormItems(props: { products: Product[] }) {
  return (
    <>
      <Form.Item
        name="name"
        label="名称"
        rules={[
          { required: true, message: "请输入活动名称" },
          { max: 30, message: "名称不能超过 30 字" },
        ]}
      >
        <Input placeholder="活动名称" />
      </Form.Item>
      <Form.Item name="type" label="类型" rules={[{ required: true, message: "请选择活动类型" }]}>
        <Select
          options={[
            { label: "普通活动", value: 0 },
            { label: "拼团活动", value: 1 },
          ]}
        />
      </Form.Item>
      <Form.Item name="desc" label="描述">
        <Input.TextArea rows={2} placeholder="活动描述（可选）" />
      </Form.Item>
      {/* 前端不复刻"结束须晚于开始"校验，留作后端 400 字符串 detail → toast 的实测口 */}
      <Form.Item
        name="range"
        label="活动时间窗"
        rules={[{ required: true, message: "请选择活动时间" }]}
      >
        <DatePicker.RangePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item
        name="productId"
        label="参与商品"
        rules={[{ required: true, message: "请选择商品" }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="选择商品"
          options={props.products.map((p) => ({ label: p.name, value: p.id }))}
        />
      </Form.Item>
    </>
  );
}
