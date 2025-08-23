# 评估总结报告 API 文档

## 接口概述

获取评估任务的总结报告，包含各个指标的得分、总结内容和综合得分。

## 接口信息

- **接口名称**: 获取总结报告
- **请求方法**: GET
- **请求URL**: `/api/core/evaluation/summary`
- **权限要求**: 需要用户登录，只能访问自己团队的评估任务

## 请求参数

### Query 参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| evalId | string | 是 | 评估任务ID | "507f1f77bcf86cd799439011" |

### 请求示例

```bash
curl -X GET "http://localhost:3000/api/core/evaluation/summary?evalId=507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token"
```

## 响应参数

### 响应结构

```typescript
{
  "data": [
    {
      "metricsId": "string",      // 指标ID
      "metricsName": "string",    // 指标名称
      "metricsScore": number,     // 指标得分
      "summary": "string",        // 总结内容
      "summaryStatus": "string",  // 总结状态
      "errorReason": "string"     // 总结失败原因（可选）
    }
  ],
  "avgScore": number             // 综合得分
}
```

### 参数说明

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| data | Array | 维度列表 | - |
| data[].metricsId | string | 指标ID | "507f1f77bcf86cd799439011" |
| data[].metricsName | string | 指标名称 | "准确性指标" |
| data[].metricsScore | number | 指标得分 | 85.5 |
| data[].summary | string | 总结内容 | "该指标表现良好，准确率达到85%" |
| data[].summaryStatus | string | 总结状态 | "2" (0:待处理, 1:生成中, 2:完成, 3:失败) |
| data[].errorReason | string | 总结失败原因 | "网络连接超时" |
| avgScore | number | 综合得分 | 88.75 |

### 响应示例

```json
{
  "data": [
    {
      "metricsId": "507f1f77bcf86cd799439011",
      "metricsName": "准确性指标",
      "metricsScore": 85.5,
      "summary": "准确性指标表现良好，整体准确率达到85.5%，在大部分测试用例中表现稳定。",
      "summaryStatus": "2",
      "errorReason": null
    },
    {
      "metricsId": "507f1f77bcf86cd799439012",
      "metricsName": "完整性指标",
      "metricsScore": 92.0,
      "summary": "完整性指标表现优秀，完整率达到92%，能够很好地覆盖用户需求。",
      "summaryStatus": "2",
      "errorReason": null
    }
  ],
  "avgScore": 88.75
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（如evalId缺失） |
| 401 | 未授权访问 |
| 403 | 权限不足 |
| 404 | 评估任务不存在 |
| 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "error": "评估任务不存在或无权限访问"
}
```

## 业务逻辑

### 权限校验
1. 验证用户登录状态
2. 检查评估任务是否属于当前用户的团队
3. 确保用户有访问该评估任务的权限

### 数据查询
1. 根据evalId查询评估任务基本信息
2. 获取评估任务的eval_data字段（包含各指标数据）
3. 关联查询指标表获取指标名称
4. 计算综合得分

### 数据验证
1. 检查评估任务是否存在
2. 验证评估任务是否已完成
3. 确保eval_data字段不为空

## 使用场景

1. **评估结果展示**: 在评估详情页面展示各指标的得分和总结
2. **报告生成**: 生成评估报告时获取总结数据
3. **数据分析**: 分析不同指标的评估结果
4. **质量监控**: 监控评估任务的整体质量

## 注意事项

1. 只有已完成的评估任务才能获取总结报告
2. 总结状态为失败时，errorReason字段会包含失败原因
3. 指标名称如果查询不到，会使用指标ID作为名称
4. 综合得分是各指标得分的平均值

## 相关接口

- `GET /api/core/evaluation/task/list` - 获取评估任务列表
- `GET /api/core/evaluation/task/item/list` - 获取评估项列表
- `GET /api/core/evaluation/task/stats` - 获取评估任务统计信息
