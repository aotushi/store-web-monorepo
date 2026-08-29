import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Workbook } from "exceljs";
import { Repository } from "typeorm";
import { Product } from "./entities/product.entity";

// 导入模板第一行表头，列序固定；单元格按纯文本/数字解析（富文本、公式不支持）
const HEADERS = ["商品名称", "商品描述", "价格"];

interface RowError {
  row: number;
  errors: string[];
}

// 单元格取文本：契约只收纯文本/数字，其余形态（富文本、公式等对象值）一律视为空，交给行校验拒绝
const cellText = (v: unknown): string =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";

@Injectable()
export class ProductImportService {
  constructor(@InjectRepository(Product) private readonly productRepo: Repository<Product>) {}

  // 全量校验（行级错误一次性收集，风格对齐 ValidationPipe 字段级数组），全对才入库——避免半截导入
  async importFromExcel(buffer: Buffer): Promise<{ imported: number }> {
    const workbook = new Workbook();
    // exceljs 自带旧版 @types/node，其 Buffer 声明与本项目的不兼容（运行时同为 Node Buffer），按其参数类型断言
    const excelBuffer = buffer as unknown as Parameters<Workbook["xlsx"]["load"]>[0];
    await workbook.xlsx.load(excelBuffer).catch(() => {
      throw new BadRequestException("文件不是有效的 xlsx");
    });
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("文件不是有效的 xlsx");

    const headerRow = sheet.getRow(1);
    const matched = HEADERS.every((h, i) => cellText(headerRow.getCell(i + 1).value) === h);
    if (!matched) {
      throw new BadRequestException(`模板表头不符，应为：${HEADERS.join(" | ")}`);
    }

    const rows: Partial<Product>[] = [];
    const rowErrors: RowError[] = [];
    // eachRow 默认跳过空行
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = cellText(row.getCell(1).value);
      const desc = cellText(row.getCell(2).value);
      const priceRaw = row.getCell(3).value;
      // 空文本 Number('') 得 0，落进"价格必须不小于 0.01"的既有校验，不需要单列空值分支
      const price = typeof priceRaw === "number" ? priceRaw : Number(cellText(priceRaw));

      const errors: string[] = [];
      if (!name) errors.push("商品名称不能为空");
      else if (name.length > 50) errors.push("商品名称不能超过 50 个字符");
      if (!desc) errors.push("商品描述不能为空");
      if (!Number.isFinite(price) || price < 0.01) errors.push("价格必须为不小于 0.01 的数字");
      else if (Math.round(price * 100) / 100 !== price) errors.push("价格最多两位小数");

      if (errors.length) rowErrors.push({ row: rowNumber, errors });
      else rows.push({ name, desc, price, status: 0, images: null });
    });

    if (rowErrors.length) throw new BadRequestException(rowErrors);
    if (!rows.length) throw new BadRequestException("文件中没有可导入的数据行");

    // save 多实体默认包在单事务里，任一行失败整体回滚
    await this.productRepo.save(this.productRepo.create(rows));
    return { imported: rows.length };
  }
}
