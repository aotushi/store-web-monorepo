import { ApiProperty } from "@nestjs/swagger";

// 首页看板聚合 VO：嵌套结构全部显式类声明，orval 才能生成完整类型（匿名对象会退化 object）
export class StatsCountsVo {
  @ApiProperty({ description: "用户总数" })
  user: number;

  @ApiProperty({ description: "商品总数" })
  product: number;

  @ApiProperty({ description: "在售商品数" })
  productOnSale: number;

  @ApiProperty({ description: "订单总数" })
  order: number;

  @ApiProperty({ description: "活动总数" })
  activity: number;

  @ApiProperty({ description: "进行中活动数" })
  activityOngoing: number;
}

export class StatsOrderStatusVo {
  @ApiProperty({ description: "未付款单数" })
  unpaid: number;

  @ApiProperty({ description: "已付款单数" })
  paid: number;

  @ApiProperty({ description: "已取消单数" })
  cancelled: number;
}

export class StatsRevenueVo {
  @ApiProperty({ description: "累计营收（已付款订单折后价合计）" })
  total: number;

  @ApiProperty({ description: "今日营收（本地日界）" })
  today: number;
}

export class StatsTrendPointVo {
  @ApiProperty({ description: "日期（YYYY-MM-DD，本地时区）" })
  date: string;

  @ApiProperty({ description: "当日订单数（含未付款/已取消）" })
  orderCount: number;

  @ApiProperty({ description: "当日营收（仅已付款）" })
  revenue: number;
}

export class StatsOverviewVo {
  @ApiProperty({ description: "实体总量", type: StatsCountsVo })
  counts: StatsCountsVo;

  @ApiProperty({ description: "订单状态分布", type: StatsOrderStatusVo })
  orderStatus: StatsOrderStatusVo;

  @ApiProperty({ description: "营收", type: StatsRevenueVo })
  revenue: StatsRevenueVo;

  @ApiProperty({ description: "近 7 日趋势（含今天，缺日补零）", type: [StatsTrendPointVo] })
  trend: StatsTrendPointVo[];
}
