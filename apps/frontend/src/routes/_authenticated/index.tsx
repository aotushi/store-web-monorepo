import { PageContainer } from "@ant-design/pro-components";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, Card, Col, Row, Spin, Statistic } from "antd";
import { useStatsControllerOverview } from "@/apis/generated/stats/stats";
import type { StatsTrendPointVo } from "@/apis/generated/storeWebAPI.schemas";
import { errorText } from "@/apis/error";
import { usePermission } from "@/permission/Permission";

// 首页看板：数据接口挂 Home 码，页面守卫仍豁免（避免"登录成功即 403"死角）——
// 于是门控落在数据层：无 Home 码渲染欢迎卡且不发请求（enabled 双闸），有码才拉聚合统计。
// 趋势图手写 CSS 柱状（SIMPLE：单接口一屏可视，不为 7 根柱子引图表库）
export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

function HomePage() {
  const { me } = Route.useRouteContext();
  const { has } = usePermission();
  const canView = has("Home");

  return (
    <PageContainer title={`欢迎，${me.username}`}>
      {canView ? <Dashboard /> : <WelcomeCard />}
    </PageContainer>
  );
}

// 无 Home 码的降级视图（原欢迎卡收缩版）
function WelcomeCard() {
  return (
    <Card>
      <Alert
        type="info"
        showIcon
        message="暂无首页看板权限"
        description="当前账号未分配 Home 权限点，看板数据不可见。如需查看请联系管理员调整角色权限。"
      />
    </Card>
  );
}

function Dashboard() {
  const statsQuery = useStatsControllerOverview();

  if (statsQuery.isPending) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin />
      </div>
    );
  }
  if (statsQuery.isError) {
    return <Alert type="error" showIcon message={errorText(statsQuery.error)} />;
  }

  const { counts, orderStatus, revenue, trend } = statsQuery.data;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <Card>
          <Statistic title="用户总数" value={counts.user} />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="商品总数"
            value={counts.product}
            suffix={`/ 在售 ${counts.productOnSale}`}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic title="订单总数" value={counts.order} />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="活动总数"
            value={counts.activity}
            suffix={`/ 进行中 ${counts.activityOngoing}`}
          />
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card title="营收">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="累计（已付款）" value={revenue.total} prefix="¥" precision={2} />
            </Col>
            <Col span={12}>
              <Statistic title="今日" value={revenue.today} prefix="¥" precision={2} />
            </Col>
          </Row>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="订单状态分布">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="未付款"
                value={orderStatus.unpaid}
                valueStyle={{ color: "#faad14" }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="已付款"
                value={orderStatus.paid}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="已取消"
                value={orderStatus.cancelled}
                valueStyle={{ color: "#999" }}
              />
            </Col>
          </Row>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="近 7 日趋势（柱=订单数，脚注=当日营收）">
          <TrendChart trend={trend} />
        </Card>
      </Col>
    </Row>
  );
}

// 柱高用固定像素上限换算，避免 flex 列内百分比高度陷阱
const BAR_MAX_HEIGHT = 120;

function TrendChart(props: { trend: StatsTrendPointVo[] }) {
  const max = Math.max(...props.trend.map((p) => p.orderCount), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
      {props.trend.map((p) => (
        <div
          key={p.date}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12 }}>{p.orderCount}</span>
          <div
            title={`${p.date} 订单 ${p.orderCount} 单，营收 ¥${p.revenue}`}
            style={{
              width: "60%",
              maxWidth: 48,
              height: Math.round((p.orderCount / max) * BAR_MAX_HEIGHT),
              minHeight: p.orderCount > 0 ? 4 : 2,
              background: p.orderCount > 0 ? "#1677ff" : "#f0f0f0",
              borderRadius: "4px 4px 0 0",
            }}
          />
          <span style={{ fontSize: 12, color: "#999" }}>{p.date.slice(5)}</span>
          <span style={{ fontSize: 12, color: "#52c41a" }}>¥{p.revenue}</span>
        </div>
      ))}
    </div>
  );
}
