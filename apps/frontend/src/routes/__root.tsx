import { createRootRoute, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

// Devtools 只进 dev 构建：PROD 下换空组件 + lazy 保证包体零残留
const RouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );
const QueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    );

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Suspense>
        <RouterDevtools position="bottom-right" />
        <QueryDevtools initialIsOpen={false} />
      </Suspense>
    </>
  ),
});
