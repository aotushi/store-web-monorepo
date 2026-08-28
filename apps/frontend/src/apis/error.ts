import type { FormInstance } from 'antd';
import { ApiError } from './mutator';

// 后端 ValidationPipe exceptionFactory 的字段级 400 形状（backend main.ts 约定）
interface FieldError {
  field: string;
  errors: string[];
}

export function errorText(err: unknown, fallback = '操作失败'): string {
  return err instanceof Error ? err.message : fallback;
}

// 双层校验的权威半场（PLAN §5.6）：后端 400 字段级数组回填到 antd 表单对应字段；
// 非字段级错误返回 false，交调用方 toast
export function applyFieldErrors<Values>(form: FormInstance<Values>, err: unknown): boolean {
  if (!(err instanceof ApiError) || !Array.isArray(err.detail)) return false;
  const fields = (err.detail as FieldError[]).filter((d) => typeof d?.field === 'string');
  if (fields.length === 0) return false;
  form.setFields(
    // 字段名是运行时数据，编译期无法窄化成 NamePath<Values>，此处单点断言
    fields.map((d) => ({
      name: d.field,
      errors: d.errors,
    })) as Parameters<FormInstance<Values>['setFields']>[0],
  );
  return true;
}
