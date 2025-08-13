# FastGPT 评估模块迁移说明

本文档说明了从 diting 项目迁移到 FastGPT 的评估模块设计和实现。

## 迁移概述

将 diting 中的评估设计迁移至 FastGPT 中，主要涉及将 FastGPT 的评估模块进一步拆分为以下四个核心组件：

1. **Evaluation Dataset（评估数据集）**
2. **Evaluation Targets（评估目标）**
3. **Evaluators（评估器）**
4. **Evaluation Tasks（评估任务）**

## 架构设计

### 1. 评估数据集 (Evaluation Dataset)

**功能：**
- 管理评估数据的集合，每个评估数据包括：
  - user_input（用户输入）
  - actual_output（模型输出）
  - expected_output（预期输出）
  - context（上下文）
  - retrieval_context（检索到的上下文）
  - metadata（元信息，如场景标签）

**特性：**
- 支持 Jsonl、Excel 等文件导入，兼容并支持 HuggingFace dataset 的导入导出
- 支持基于 prompt+语料自动生成，语料定义包含 context/scenario/persona 等
- 支持多版本控制
- 提供数据查询和过滤功能

**文件位置：**
- 类型定义：`packages/global/core/evaluation/type.ts`
- 数据库 Schema：`packages/service/core/evaluation/evaluationDatasetSchema.ts`
- 领域模型：`packages/service/core/evaluation/domain/EvaluationDataset.ts`
- API 接口：`projects/app/src/pages/api/core/evaluation/datasets/`
- 前端页面：`projects/app/src/pages/dashboard/evaluation/datasets/`

### 2. 评估目标 (Evaluation Targets)

**功能：**
- 代表被评估的 AI 应用
- 支持多种类型：Mock、HTTP、Function、App
- 提供统一的调用接口

**类型说明：**
- **Mock**: 模拟响应，用于测试
- **HTTP**: 通过 HTTP 接口调用外部服务
- **Function**: 调用本地函数
- **App**: 调用 FastGPT 内部应用

**文件位置：**
- 类型定义：`packages/global/core/evaluation/type.ts`
- 数据库 Schema：`packages/service/core/evaluation/evalTargetSchema.ts`
- 领域模型：`packages/service/core/evaluation/domain/EvalTarget.ts`
- API 接口：`projects/app/src/pages/api/core/evaluation/targets/`
- 前端页面：`projects/app/src/pages/dashboard/evaluation/targets/`

### 3. 评估器 (Evaluators)

**功能：**
- 负责评估逻辑的实现
- 内置多种评估器类型
- 支持自定义评估器扩展

**类型说明：**
- **Accuracy**: 准确度评估，基于精确匹配
- **Semantic Similarity**: 语义相似度评估
- **Custom**: 自定义评估器
- **LLM**: 基于大语言模型的评估器

**文件位置：**
- 类型定义：`packages/global/core/evaluation/type.ts`
- 数据库 Schema：`packages/service/core/evaluation/evaluatorSchema.ts`
- 领域模型：`packages/service/core/evaluation/domain/Evaluator.ts`
- API 接口：`projects/app/src/pages/api/core/evaluation/evaluators/`
- 前端页面：`projects/app/src/pages/dashboard/evaluation/evaluators/`

### 4. 评估实验和任务 (Evaluation Experiments & Tasks)

**功能：**
- 评估实验：协调整个评估流程
- 评估任务：提供实验流程控制，支持批量处理和重试机制

**特性：**
- 支持并行和串行执行
- 提供进度跟踪和结果汇总
- 支持任务重试和错误处理
- 提供详细的统计信息

**文件位置：**
- 类型定义：`packages/global/core/evaluation/type.ts`
- 数据库 Schema：
  - `packages/service/core/evaluation/evalExperimentSchema.ts`
  - `packages/service/core/evaluation/evalTaskSchema.ts`
- 领域模型：`packages/service/core/evaluation/domain/EvalExperiment.ts`
- 评估链：`packages/service/core/evaluation/domain/EvalChain.ts`
- API 接口：`projects/app/src/pages/api/core/evaluation/experiments/`
- 前端页面：`projects/app/src/pages/dashboard/evaluation/experiments/`

## 核心组件

### 评估链 (EvalChain)

**功能：**
- 协调整个评估流程
- 实现标准的评估步骤
- 支持进度跟踪和结果汇总

**主要方法：**
- `execute()`: 执行单个评估
- `executeBatch()`: 批量执行评估
- `getStatistics()`: 获取统计信息

### 工具函数

**位置：** `packages/global/core/evaluation/utils.ts`

**主要功能：**
- 数据验证
- ID 生成
- 相似度计算
- 分数格式化
- 统计计算

### 常量定义

**位置：** `packages/global/core/evaluation/constants.ts`

**包含：**
- 评估状态枚举
- 评估目标类型
- 评估器类型
- 数据源类型
- 配置默认值

## 数据库设计

### 集合结构

1. **evaluation_datasets**: 评估数据集
2. **eval_targets**: 评估目标
3. **evaluators**: 评估器
4. **eval_experiments**: 评估实验
5. **eval_tasks**: 评估任务

### 索引设计

- 按团队 ID 和时间排序
- 支持搜索和过滤
- 优化查询性能

## API 设计

### RESTful 接口

每个模块都提供标准的 CRUD 操作：

- `POST /api/core/evaluation/{module}/create` - 创建
- `POST /api/core/evaluation/{module}/list` - 列表查询
- `GET /api/core/evaluation/{module}/detail` - 详情查询
- `PUT /api/core/evaluation/{module}/update` - 更新
- `DELETE /api/core/evaluation/{module}/delete` - 删除

### 特殊接口

- 实验执行：`POST /api/core/evaluation/experiments/{id}/execute`
- 实验取消：`POST /api/core/evaluation/experiments/{id}/cancel`
- 任务重试：`POST /api/core/evaluation/tasks/{id}/retry`

## 前端设计

### 页面结构

```
/dashboard/evaluation/
├── datasets/          # 评估数据集管理
│   ├── index.tsx      # 列表页面
│   ├── create.tsx     # 创建页面
│   └── [id]/          # 详情页面
├── targets/           # 评估目标管理
│   ├── index.tsx      # 列表页面
│   ├── create.tsx     # 创建页面
│   └── [id]/          # 详情页面
├── evaluators/        # 评估器管理
│   ├── index.tsx      # 列表页面
│   ├── create.tsx     # 创建页面
│   └── [id]/          # 详情页面
└── experiments/       # 评估实验管理
    ├── index.tsx      # 列表页面
    ├── create.tsx     # 创建页面
    └── [id]/          # 详情页面
```

### 组件特性

- 响应式设计
- 实时进度显示
- 状态管理
- 错误处理
- 国际化支持

## 使用流程

### 1. 创建评估数据集

1. 进入评估数据集页面
2. 点击"创建"按钮
3. 填写数据集信息（名称、描述、版本等）
4. 选择数据源类型
5. 上传或输入评估数据
6. 保存数据集

### 2. 配置评估目标

1. 进入评估目标页面
2. 点击"创建"按钮
3. 选择目标类型（Mock/HTTP/Function/App）
4. 配置相应的参数
5. 测试连接
6. 保存目标

### 3. 创建评估器

1. 进入评估器页面
2. 点击"创建"按钮
3. 选择评估器类型
4. 配置评估参数
5. 测试评估器
6. 保存评估器

### 4. 运行评估实验

1. 进入评估实验页面
2. 点击"创建"按钮
3. 选择数据集、目标和评估器
4. 配置实验参数
5. 启动实验
6. 监控进度和结果

## 扩展性

### 自定义评估器

可以通过实现自定义评估器来扩展评估能力：

```typescript
const customEvaluator = new Evaluator({
  name: 'Custom Evaluator',
  config: {
    type: 'custom',
    params: {
      function: async (actual: string, expected: string, context: any) => {
        // 自定义评估逻辑
        return { score: 0.8, details: {} };
      }
    }
  }
});
```

### 自定义评估目标

可以添加新的评估目标类型：

```typescript
const customTarget = new EvalTarget({
  name: 'Custom Target',
  config: {
    type: 'custom',
    config: {
      // 自定义配置
    }
  }
});
```

## 注意事项

1. **权限控制**: 所有操作都需要团队权限验证
2. **数据安全**: 评估数据包含敏感信息，需要适当的访问控制
3. **性能优化**: 大量数据评估时需要考虑并发和资源限制
4. **错误处理**: 完善的错误处理和重试机制
5. **监控告警**: 评估过程中的异常需要及时告警

## 后续计划

1. **集成现有评估**: 与 FastGPT 现有的评估功能集成
2. **性能优化**: 优化大规模评估的性能
3. **可视化增强**: 添加更丰富的图表和统计信息
4. **自动化流程**: 支持评估流程的自动化
5. **报告生成**: 生成详细的评估报告

## 总结

通过这次迁移，FastGPT 获得了完整的评估模块，支持：

- 灵活的评估数据集管理
- 多种类型的评估目标
- 可扩展的评估器系统
- 完整的评估实验流程
- 友好的用户界面

这为 FastGPT 提供了强大的 AI 应用评估能力，有助于提升应用质量和用户体验。
