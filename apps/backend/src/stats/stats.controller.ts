import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { StatsService } from "./stats.service";
import { StatsOverviewVo } from "./vo/stats-overview.vo";

@ApiTags("stats")
@ApiBearerAuth()
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // 看板与首页同门槛：复用 Home 页面码，不新造权限点
  @Get("overview")
  @RequirePermission("Home")
  @ApiOperation({ summary: "首页看板聚合统计" })
  @ApiOkResponse({ type: StatsOverviewVo })
  overview() {
    return this.statsService.overview();
  }
}
