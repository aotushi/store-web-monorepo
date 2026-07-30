import { ValueTransformer } from 'typeorm';

// mysql decimal 列驱动层返回 string（保精度），业务侧统一转 number
// 金额两位小数在 JS double 的 15~16 位有效数字内，转换安全；千万级以上金额系统才需要 string/BigInt 方案
export class DecimalColumnTransformer implements ValueTransformer {
  to(value: number): number {
    return value;
  }
  from(value: string | null): number | null {
    return value === null ? null : parseFloat(value);
  }
}
