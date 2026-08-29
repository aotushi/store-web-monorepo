import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// 豁免全局 JwtAuthGuard（默认安全：未标记的路由一律要求登录，PLAN §6.2）
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
