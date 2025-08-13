// 评估数据类型
export interface EvaluationData {
  id: string;
  user_input: string;
  actual_output?: string;
  expected_output: string;
  context?: string;
  retrieval_context?: string;
  metadata?: Record<string, any>;
  scenario?: string;
  persona?: string;
}

// 评估数据集类型
export interface EvaluationDataset {
  id: string;
  name: string;
  description?: string;
  version: string;
  data: EvaluationData[];
  created_at: Date;
  updated_at: Date;
  tags?: string[];
  source_type: 'manual' | 'jsonl' | 'excel' | 'huggingface' | 'generated';
  source_config?: Record<string, any>;
  teamId: string;
  tmbId: string;
}

// 评估目标配置类型
export interface EvalTargetConfig {
  type: 'mock' | 'http' | 'function' | 'app';
  config: MockConfig | HttpConfig | FunctionConfig | AppConfig;
}

export interface MockConfig {
  responses: Array<{
    input_pattern?: string;
    output: string;
    delay?: number;
  }>;
}

export interface HttpConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
  retry_count?: number;
}

export interface FunctionConfig {
  module_path: string;
  function_name: string;
  args?: any[];
  kwargs?: Record<string, any>;
}

export interface AppConfig {
  appId: string;
  chatModel?: string;
  variables?: Record<string, any>;
}

// 评估目标类型
export interface EvalTarget {
  id: string;
  name: string;
  description?: string;
  config: EvalTargetConfig;
  created_at: Date;
  updated_at: Date;
  teamId: string;
  tmbId: string;
}

// 评估器配置类型
export interface EvaluatorConfig {
  type: 'accuracy' | 'semantic_similarity' | 'custom' | 'llm';
  params?: Record<string, any>;
}

// 评估器类型
export interface Evaluator {
  id: string;
  name: string;
  description?: string;
  config: EvaluatorConfig;
  created_at: Date;
  updated_at: Date;
  teamId: string;
  tmbId: string;
}

// 评估结果类型
export interface EvaluationResult {
  id: string;
  evaluation_data_id: string;
  evaluator_id: string;
  score: number;
  details?: Record<string, any>;
  error?: string;
  execution_time_ms: number;
  created_at: Date;
}

// 评估实验类型
export interface EvalExperiment {
  id: string;
  name: string;
  description?: string;
  dataset_id: string;
  target_id: string;
  evaluator_ids: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: any;
  config?: Record<string, any>;
  error?: string;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  teamId: string;
  tmbId: string;
}

// 评估任务类型
export interface EvalTask {
  id: string;
  experiment_id: string;
  evaluation_data_id: string;
  target_id: string;
  evaluator_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: EvaluationResult;
  error?: string;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

// 数据库Schema类型
export interface EvaluationDatasetSchemaType extends EvaluationDataset {
  _id: string;
}

export interface EvalTargetSchemaType extends EvalTarget {
  _id: string;
}

export interface EvaluatorSchemaType extends Evaluator {
  _id: string;
}

export interface EvalExperimentSchemaType extends EvalExperiment {
  _id: string;
}

export interface EvalTaskSchemaType extends EvalTask {
  _id: string;
}

// API请求/响应类型
export interface CreateEvaluationDatasetBody {
  name: string;
  description?: string;
  version: string;
  data: EvaluationData[];
  tags?: string[];
  source_type: 'manual' | 'jsonl' | 'excel' | 'huggingface' | 'generated';
  source_config?: Record<string, any>;
}

export interface CreateEvalTargetBody {
  name: string;
  description?: string;
  config: EvalTargetConfig;
}

export interface CreateEvaluatorBody {
  name: string;
  description?: string;
  config: EvaluatorConfig;
}

export interface CreateEvalExperimentBody {
  name: string;
  description?: string;
  dataset_id: string;
  target_id: string;
  evaluator_ids: string[];
  config?: Record<string, any>;
}

export interface ListEvaluationDatasetsBody {
  searchKey?: string;
  pageNum: number;
  pageSize: number;
}

export interface ListEvalTargetsBody {
  searchKey?: string;
  pageNum: number;
  pageSize: number;
}

export interface ListEvaluatorsBody {
  searchKey?: string;
  pageNum: number;
  pageSize: number;
}

export interface ListEvalExperimentsBody {
  searchKey?: string;
  pageNum: number;
  pageSize: number;
}

export interface ListEvalTasksBody {
  experiment_id: string;
  pageNum: number;
  pageSize: number;
}