import Joi from 'joi';

// 环境变量白名单：启动时 Joi 校验，缺失/非法直接 fail-fast（PLAN §6.5）
// 业务代码禁止散用 process.env，一律注入 ConfigService 读取
export const envValidationSchema = Joi.object({
  APP_PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),

  DB_HOST: Joi.string().default('127.0.0.1'),
  // 宿主 3306 被本机 mysqld 占用，docker mysql 走 3307（docs/ISSUES.md #1）
  DB_PORT: Joi.number().port().default(3307),
  DB_USERNAME: Joi.string().default('root'),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().default('store_web_project'),

  // 逗号分隔的 CORS 允许来源
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
});
