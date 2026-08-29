// ioredis 客户端注入令牌（provider 用 useFactory 创建，业务经 RedisService 使用）
export const REDIS_CLIENT = Symbol("REDIS_CLIENT");
