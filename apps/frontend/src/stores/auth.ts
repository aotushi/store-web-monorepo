import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';

// token 落 localStorage（PLAN §5.7 持久化清单；接受 XSS 取舍，§2 已拍板）。
// getOnInit 必须开：路由 beforeLoad 守卫在组件挂载前同步读 token，
// 默认的"挂载后才读 storage"会让已登录用户刷新时被误判未登录。
const storedTokenAtom = atomWithStorage<string | null>('store-web:token', null, undefined, {
  getOnInit: true,
});

// 写入口归一：登出传 null 时转 RESET 真正移除 storage 项（直接存 null 会残留字符串 "null"）
export const tokenAtom = atom(
  (get) => get(storedTokenAtom),
  (_get, set, token: string | null) => set(storedTokenAtom, token ?? RESET),
);

// 非 React 环境（ky hooks / 路由 beforeLoad）的读写口：jotai 内建全局 store（PLAN §5.1）
const store = getDefaultStore();
export const getToken = () => store.get(tokenAtom);
export const setToken = (token: string | null) => store.set(tokenAtom, token);
