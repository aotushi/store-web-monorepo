import { WinstonModule, utilities } from 'nest-winston';
import { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// 应用统一 logger：console 走 Nest 风格彩色输出（开发可读），文件走 JSON 按天轮转（14 天保留）
// 由 NestFactory.create({ logger }) 注入后，全应用 new Logger(ctx) 的输出统一经 winston 落盘
export function createWinstonLogger() {
  return WinstonModule.createLogger({
    transports: [
      new transports.Console({
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          utilities.format.nestLike('store-web', { colors: true, prettyPrint: true }),
        ),
      }),
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        format: format.combine(format.timestamp(), format.json()),
      }),
    ],
  });
}
