import { useState } from 'react';
import { useAuthControllerLogin } from '@/apis/generated/auth/auth';
import { useHealthControllerCheck } from '@/apis/generated/health/health';
import { ApiError } from '@/apis/mutator';

// 契约链路验证页（临时）：证明 openapi.json → orval 产物 → ky 剥壳全链可用。
// 正式页面结构（TanStack Router 文件路由）进前端阶段后替换本文件。
export function App() {
  const health = useHealthControllerCheck();
  const login = useAuthControllerLogin();
  const [result, setResult] = useState('（未登录）');

  const doLogin = (password: string) => {
    login.mutate(
      { data: { username: 'test', password } },
      {
        // data 已被 mutator 剥壳，类型即裸 LoginVo——直接点出 token
        onSuccess: (data) => setResult(`登录成功 ${data.username}#${data.id}，token 前 24 位：${data.token.slice(0, 24)}…`),
        onError: (err) =>
          setResult(err instanceof ApiError ? `ApiError(${err.code})：${err.message}` : String(err)),
      },
    );
  };

  return (
    <main style={{ fontFamily: 'monospace', padding: 24, lineHeight: 2 }}>
      <h1>store-web 契约链路验证</h1>
      <p>
        /api/health（生成 query hook）：
        {health.isPending ? '探测中…' : health.isError ? '失败' : JSON.stringify(health.data)}
      </p>
      <p>
        <button onClick={() => doLogin('a123456')}>正确密码登录</button>{' '}
        <button onClick={() => doLogin('wrong-pass')}>错误密码登录</button>
      </p>
      <p data-testid="login-result">{result}</p>
    </main>
  );
}
