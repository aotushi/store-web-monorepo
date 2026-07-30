import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

// 声明接口所需权限码，PermissionGuard 消费；code 与前端权限点同源（PLAN §6.2）
// 原项目用 permission_api 表按 url+method 匹配，这里改声明式（修原实现瑕疵）
export const RequirePermission = (code: string) => SetMetadata(REQUIRE_PERMISSION_KEY, code);
