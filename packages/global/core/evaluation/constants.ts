// 评估状态枚举
export enum EvaluationStatusEnum {
  pending = 0,
  running = 1,
  completed = 2,
  failed = 3,
  cancelled = 4
}

export const EvaluationStatusValues = Object.values(EvaluationStatusEnum);

// 评估状态映射
export const EvaluationStatusMap = {
  [EvaluationStatusEnum.pending]: {
    name: 'common:status.pending',
    color: 'gray.500'
  },
  [EvaluationStatusEnum.running]: {
    name: 'common:status.running',
    color: 'blue.500'
  },
  [EvaluationStatusEnum.completed]: {
    name: 'common:status.completed',
    color: 'green.500'
  },
  [EvaluationStatusEnum.failed]: {
    name: 'common:status.failed',
    color: 'red.500'
  },
  [EvaluationStatusEnum.cancelled]: {
    name: 'common:status.cancelled',
    color: 'orange.500'
  }
};

// 评估目标类型
export enum EvalTargetTypeEnum {
  mock = 'mock',
  http = 'http',
  function = 'function',
  app = 'app'
}

// 评估器类型
export enum EvaluatorTypeEnum {
  accuracy = 'accuracy',
  semantic_similarity = 'semantic_similarity',
  custom = 'custom',
  llm = 'llm'
}

// 数据源类型
export enum DataSourceTypeEnum {
  manual = 'manual',
  jsonl = 'jsonl',
  excel = 'excel',
  huggingface = 'huggingface',
  generated = 'generated'
}

// 任务重试配置
export const TASK_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2
};

// 评估配置默认值
export const EVALUATION_CONFIG_DEFAULTS = {
  TIMEOUT_MS: 30000,
  BATCH_SIZE: 5,
  CONCURRENCY: 3
};
