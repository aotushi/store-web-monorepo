import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

// 成功态响应壳（PLAN §6.1）：{ code, success, data, message } 四字段，与异常过滤器两态对称
// controller 只 return 裸数据；swagger 保持裸类型，壳由前端 orval mutator 统一剥（PLAN §7#11）
export interface ResponseShell<T> {
  code: number;
  success: true;
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseShell<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseShell<T>> {
    const { statusCode } = context.switchToHttp().getResponse<{ statusCode: number }>();
    return next.handle().pipe(
      map((data) => ({
        code: statusCode,
        success: true as const,
        // handler 无返回值时补 null，保证 data 字段恒在
        data: data ?? (null as T),
        message: "ok",
      })),
    );
  }
}
