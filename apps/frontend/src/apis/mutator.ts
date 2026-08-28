import ky, { HTTPError } from 'ky';
import { getToken, setToken } from '@/stores/auth';

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

// 认证横切三件事全挂 ky hooks，业务代码零感知（PLAN §5.5）
const client = ky.create({
  timeout: 10_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token) request.headers.set('authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      (request, _options, response) => {
        // 滑动续期：后端 Guard 对临期 token 重签、新 token 放响应头，这里静默替换本地
        const fresh = response.headers.get('token');
        if (fresh) setToken(fresh);
        // 401 唯一语义 = 登录态失效 → 清 token 回登录页（无 refresh 接口、无重放队列）；
        // 登录接口自身的 401 是"密码错"业务失败，交表单展示，不在此拦
        if (response.status === 401 && !new URL(request.url).pathname.endsWith('/auth/login')) {
          setToken(null);
          window.location.assign('/login');
        }
      },
    ],
  },
});

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

  // multipart：FormData 必须走 body 且不能手动设 Content-Type（boundary 由浏览器生成），
  // 而 orval 对 multipart 接口会硬编码一个无 boundary 的 'Content-Type' 头，这里丢弃它
  const isForm = data instanceof FormData;
  const { 'Content-Type': _dropped, ...restHeaders } = headers ?? {};

  let shell: ResponseShell<T>;
  try {
    shell = await client(url.replace(/^\//, ''), {
      method,
      prefixUrl: '/',
      searchParams,
      ...(isForm
        ? { body: data, headers: restHeaders }
        : { json: data === undefined ? undefined : data, headers }),
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
