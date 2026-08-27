import ky, { HTTPError } from 'ky';

// 后端统一响应壳（ResponseInterceptor / AllExceptionsFilter 两态对称）
interface ResponseShell<T> {
  code: number;
  success: boolean;
  data: T;
  message: string | unknown[];
}

// 归一化业务错误：HTTP 层与业务壳压平成一个错误对象，Query 全局 onError 只认它
// detail 保留原始 message（字段级 400 是数组，表单回填要用）
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// token 注入 / 401 跳转 / 滑动续期响应头接收，后续都挂这里的 ky hooks（PLAN §5.4）
const client = ky.create({ timeout: 10_000 });

interface FetcherConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// orval 生成的所有请求走此函数：发请求 + 剥壳返回内层 data——
// 后端加壳、这里剥壳、orval 类型是裸 data，三方正好对上（PLAN §7#11）
export async function customFetcher<T>(config: FetcherConfig): Promise<T> {
  const { url, method, params, data, headers, signal } = config;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) searchParams.set(key, String(value));
  }

  let shell: ResponseShell<T>;
  try {
    shell = await client(url.replace(/^\//, ''), {
      method,
      prefixUrl: '/',
      searchParams,
      json: data === undefined ? undefined : data,
      headers,
      signal,
    }).json<ResponseShell<T>>();
  } catch (err) {
    // 非 2xx：失败壳在响应体里，解析出来压成 ApiError
    if (err instanceof HTTPError) {
      const body = (await err.response.json().catch(() => null)) as ResponseShell<unknown> | null;
      const raw = body?.message ?? err.message;
      const text = Array.isArray(raw) ? '请求参数有误' : String(raw);
      throw new ApiError(body?.code ?? err.response.status, text, body?.message);
    }
    throw err;
  }
  return shell.data;
}
