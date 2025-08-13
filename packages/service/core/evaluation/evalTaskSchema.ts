import { connectionMongo, getMongoModel } from '../../../common/mongo';
import type { EvalTaskSchemaType } from '@fastgpt/global/core/evaluation/type';
import { EvaluationStatusEnum, EvaluationStatusValues } from '@fastgpt/global/core/evaluation/constants';

const { Schema } = connectionMongo;

export const EvalTaskCollectionName = 'eval_tasks';

const EvalTaskSchema = new Schema({
  experiment_id: {
    type: String,
    required: true
  },
  evaluation_data_id: {
    type: String,
    required: true
  },
  target_id: {
    type: String,
    required: true
  },
  evaluator_id: {
    type: String,
    required: true
  },
  status: {
    type: Number,
    default: EvaluationStatusEnum.pending,
    enum: EvaluationStatusValues
  },
  result: {
    id: String,
    evaluation_data_id: String,
    evaluator_id: String,
    score: Number,
    details: Object,
    error: String,
    execution_time_ms: Number,
    created_at: Date
  },
  error: String,
  retry_count: {
    type: Number,
    default: 0
  },
  max_retries: {
    type: Number,
    default: 3
  },
  created_at: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  updated_at: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  started_at: Date,
  completed_at: Date
});

EvalTaskSchema.index({ experiment_id: 1, status: 1 });
EvalTaskSchema.index({ experiment_id: 1, created_at: -1 });

export const MongoEvalTask = getMongoModel<EvalTaskSchemaType>(
  EvalTaskCollectionName,
  EvalTaskSchema
);
