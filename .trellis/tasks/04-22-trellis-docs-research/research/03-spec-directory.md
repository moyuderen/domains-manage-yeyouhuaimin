# Research: spec/ 目录的规范写法和组织方式

- **Query**: spec/ 目录的规范写法、组织方式和最佳实践
- **Scope**: external
- **Date**: 2026-04-22

## Spec 目录结构

### trellis init 默认结构

```
.trellis/spec/
├── frontend/                    # 前端规范
│   ├── index.md                 #   索引
│   ├── component-guidelines.md  #   组件规范
│   ├── hook-guidelines.md       #   Hook 规范
│   ├── state-management.md      #   状态管理
│   ├── type-safety.md           #   类型安全
│   ├── quality-guidelines.md    #   质量指南
│   └── directory-structure.md   #   目录结构
├── backend/                     # 后端规范
│   ├── index.md
│   ├── database-guidelines.md
│   ├── error-handling.md
│   ├── logging-guidelines.md
│   ├── quality-guidelines.md
│   └── directory-structure.md
└── guides/                      # 思维指南
    ├── index.md
    ├── cross-layer-thinking-guide.md
    └── code-reuse-thinking-guide.md
```

### 核心规则

**唯一硬性约定：一层 = 带 `index.md` 的目录**

- `frontend/` 和 `backend/` 没有任何魔法
- Trellis 扫描 `.trellis/spec/` 下的一级目录，只要目录里有 `index.md` 就注册为一个 spec 层
- 可以按运行时、按 package、按职责命名

### Monorepo 结构示例

```
.trellis/spec/
├── cli/                    # Package: CLI
│   ├── backend/
│   │   └── index.md
│   └── unit-test/
│       └── index.md
├── docs-site/              # Package: 文档站
│   └── docs/
│       └── index.md
└── guides/                 # 跨 package 的思维指南
    └── index.md
```

## Bootstrap 流程

1. `trellis init` 生成空占位模板（标注 "(To be filled by the team)"）
2. 同时创建 `00-bootstrap-guidelines` 任务
3. 首次运行 `/trellis:start` 时，AI 会：
   - 调 `trellis-research` 读实际代码
   - 把占位模板按真实项目填充
4. **不要跳过这个任务**——否则空壳会被注入给每个 sub-agent

## 从空模板到完整规范的步骤

### Step 1: 从实际代码中提取模式
```bash
ls src/components/    # 组件结构
ls src/services/      # 服务结构
```

### Step 2: 写下约定
```markdown
# Component Guidelines
## File Structure
- One component per file
- Use PascalCase for filenames: `UserProfile.tsx`
- Co-locate styles: `UserProfile.module.css`

## Patterns
#### Required
- Functional components + hooks (no class components)
- TypeScript with explicit Props interface

#### Forbidden
- No `any` type in Props
- No inline styles (use CSS Modules)
```

### Step 3: 添加代码示例（Good / Bad）

### Step 4: 更新 index.md 状态
```markdown
| Guideline | File | Status |
|-----------|------|--------|
| Component Guidelines | component-guidelines.md | **Filled** |
| Hook Guidelines | hook-guidelines.md | To fill |
```

## Spec 应该长什么样

trellis-update-spec 把 spec 视为**可执行契约**，不是原则性文字。

### Code-Spec vs Guide

| 类型 | 位置 | 用途 | 内容形态 |
|------|------|------|----------|
| Code-Spec | `<layer>/*.md` | "如何安全地实现" | 签名、契约、验证矩阵、Good/Base/Bad 用例、必需测试 |
| Guide | `guides/*.md` | "动手前该想到什么" | 思考清单、问题、指向具体 spec 的链接 |

**判断标准**：
- "别忘了检查 X" → 放 guide
- "X 接受 {field: type}，返回 {...}，错误矩阵如下" → 放 code-spec

### 更新形态模板

| 你学到了…… | 模板 | 关键字段 |
|------------|------|----------|
| 为什么选方案 X 而不是 Y | Design Decision | Context、Options Considered、Decision、Example |
| 本项目约定 X 这么做 | Convention | What、Why、Example、Related |
| 一种能复用的解法 | Pattern | Problem、Solution、Example（Good + Bad） |
| 一种会出问题的做法 | Forbidden Pattern | 错误片段、为什么糟、改成什么 |
| 容易犯的错 | Common Mistake | Symptom、Cause、Fix、Prevention |
| 非直觉的行为 | Gotcha | Warning 引用块 |

### 基础设施/跨层改动的强制 7 段式

涉及命令/API 签名、跨层 request-response 契约、DB schema、基础设施接线时：
1. **Scope / Trigger** — 为什么要上 code-spec 深度
2. **Signatures** — command / API / DB 签名
3. **Contracts** — request 字段、response 字段、env key
4. **Validation & Error Matrix** — `<条件> → <错误>` 表
5. **Good / Base / Bad Cases** — 例输入 + 预期结果
6. **Tests Required** — unit / integration / e2e

## 量化标准

- 每文件 200-500 行
- 每小节 20-50 行
- 具体代码例子比抽象规则有用
- 发现过时立即更新

## 外部参考

- [日常使用 - 规范编写指南](https://docs.trytrellis.app/zh/start/everyday-use)
