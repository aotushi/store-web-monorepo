import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { ActivityService } from "./activity.service";
import { ActivityQueryDto } from "./dto/activity-query.dto";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { EditActivityDto } from "./dto/edit-activity.dto";
import { Activity } from "./entities/activity.entity";
import { ActivityListVo } from "./vo/activity-list.vo";

@ApiTags("activity")
@ApiBearerAuth()
@Controller("activity")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post("create")
  @RequirePermission("ActivityManage")
  @ApiOperation({ summary: "创建活动（初始状态按时间窗推导）" })
  @ApiOkResponse({ type: Activity })
  create(@Body() dto: CreateActivityDto) {
    return this.activityService.create(dto);
  }

  @Get("list")
  @RequirePermission("ActivityManage")
  @ApiOperation({ summary: "活动列表（分页 + 名称模糊 + 状态筛选）" })
  @ApiOkResponse({ type: ActivityListVo })
  list(@Query() query: ActivityQueryDto) {
    return this.activityService.findPage(query);
  }

  @Patch("edit")
  @RequirePermission("ActivityManage")
  @ApiOperation({ summary: "编辑活动（时间窗变更时重推状态）" })
  @ApiOkResponse({ type: Activity })
  edit(@Body() dto: EditActivityDto) {
    return this.activityService.update(dto);
  }

  // 原项目用 GET /activity/delete/:id，改为语义化 DELETE（同 user/role 模块决策）
  @Delete(":id")
  @RequirePermission("delete:activity")
  @ApiOperation({ summary: "删除活动" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.activityService.remove(id);
  }
}
