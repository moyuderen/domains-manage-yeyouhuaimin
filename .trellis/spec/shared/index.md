# 共享开发规范

> 以下规范适用于域名管理平台的所有代码。

---

## 文档文件

| 文件 | 说明 | 何时阅读 |
| ---- | ---- | -------- |
| [code-quality.md](./code-quality.md) | 代码质量强制规则（含 lint 范围保护） | 始终阅读 |
| [typescript.md](./typescript.md) | TypeScript 最佳实践 | 涉及类型决策时 |
| [dependencies.md](./dependencies.md) | 依赖版本与约束 | 新增或更新依赖时 |

---

## 核心规则（强制执行）

| 规则 | 文件 |
| ---- | ---- |
| 禁止非空断言（`!`） | [code-quality.md](./code-quality.md) |
| 禁止 `any` 类型 | [code-quality.md](./code-quality.md) |
| 禁止 `@ts-expect-error` / `@ts-ignore` | [code-quality.md](./code-quality.md) |
| 所有日期操作使用 date-fns | [code-quality.md](./code-quality.md) |
| 基础组件使用 Shadcn UI | [code-quality.md](./code-quality.md) |
| `npm run lint` 和 `npm run build` 须通过 | [code-quality.md](./code-quality.md) |

---

## 每次提交前检查

- [ ] `npm run lint` — 0 个错误
- [ ] `npm run build` — 生产构建成功
- [ ] 新代码中无 `any` 类型
- [ ] 无非空断言（`!`）
- [ ] 无 `@ts-expect-error` 或 `@ts-ignore` 注释
- [ ] 已清除未使用的 import 和死代码
