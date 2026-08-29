import Joi from "joi";

// 环境变量白名单：启动时 Joi 校验，缺失/非法直接 fail-fast（PLAN §6.5）
// 业务代码禁止散用 process.env，一律注入 ConfigService 读取
export const envValidationSchema = Joi.object({
  APP_PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default("api"),

  DB_HOST: Joi.string().default("127.0.0.1"),
  // 宿主 3306 被本机 mysqld 占用，docker mysql 走 3307（docs/ISSUES.md #1）
  DB_PORT: Joi.number().port().default(3307),
  DB_USERNAME: Joi.string().default("root"),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().default("store_web_project"),

  // 逗号分隔的 CORS 允许来源
  CORS_ORIGINS: Joi.string().default("http://localhost:5173"),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default("2h"),
  // 滑动续期阈值（秒）：剩余有效期低于该值时重签 token 放响应头
  JWT_RENEW_THRESHOLD_S: Joi.number().default(1800),

  REDIS_HOST: Joi.string().default("127.0.0.1"),
  REDIS_PORT: Joi.number().port().default(6379),
  // 所有 redis key 统一业务前缀（ioredis keyPrefix 自动拼接，PLAN §6.5）
  REDIS_KEY_PREFIX: Joi.string().default("store:"),

  // SMTP 全部可选：未配 MAIL_HOST 时 MailService 降级 jsonTransport 假发送（本地开发）
  MAIL_HOST: Joi.string().allow("").default(""),
  MAIL_PORT: Joi.number().port().default(465),
  MAIL_USER: Joi.string().allow("").default(""),
  MAIL_PASS: Joi.string().allow("").default(""),
  // 发件人展示名，缺省回落 MAIL_USER
  MAIL_FROM: Joi.string().allow("").default(""),
});
