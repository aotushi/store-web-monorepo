import { PageContainer, ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { createFileRoute } from "@tanstack/react-router";
import { Image } from "antd";
import { useProductControllerHotList } from "@/apis/generated/product/product";
import type { Product } from "@/apis/generated/storeWebAPI.schemas";
import { requireCode } from "@/permission/can";

// 纯只读页：无搜索无分页无操作列。复刻口径——原项目无销量字段，
// 后端按"已上架 + 更新时间倒序前 10"给数，排名即数组下标
export const Route = createFileRoute("/_authenticated/product/hot")({
  beforeLoad: ({ context }) => requireCode(context.me, "HotProductList"),
  component: HotProductPage,
});

const columns: ProColumns<Product>[] = [
  { title: "排名", width: 64, render: (_, __, index) => index + 1 },
  {
    title: "图片",
    dataIndex: "images",
    width: 72,
    render: (_, r) =>
      r.images ? (
        <Image src={r.images} width={48} height={48} style={{ objectFit: "cover" }} />
      ) : (
        "-"
      ),
  },
  { title: "名称", dataIndex: "name" },
  { title: "描述", dataIndex: "desc", ellipsis: true },
  { title: "价格", dataIndex: "price", width: 100, render: (_, r) => `¥${r.price.toFixed(2)}` },
  { title: "更新时间", dataIndex: "updateTime", valueType: "dateTime", width: 170 },
];

function HotProductPage() {
  const hotQuery = useProductControllerHotList();

  return (
    <PageContainer title="热销商品" subTitle="已上架商品按更新时间倒序前 10">
      <ProTable<Product>
        rowKey="id"
        columns={columns}
        dataSource={hotQuery.data}
        loading={hotQuery.isFetching}
        search={false}
        options={false}
        pagination={false}
      />
    </PageContainer>
  );
}
