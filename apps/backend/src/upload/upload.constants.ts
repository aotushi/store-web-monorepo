import { join } from "node:path";

// 上传落盘目录（dev cwd = apps/backend）；由 ServeStaticModule 以 /uploads 暴露静态访问
export const UPLOAD_DIR = join(process.cwd(), "uploads");

// 种子演示图目录（仓库资产，与种子 sql 同居）：挂同一 /uploads 作 fallback，clone 即零 404
export const SEED_UPLOAD_DIR = join(process.cwd(), "..", "..", "sql", "seed-uploads");

// mimetype 白名单 → 落盘扩展名：不信任原始文件名（防路径穿越/双扩展），扩展名从 mimetype 映射
export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
