import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { connectionMongo, getMongoModel } from '../../../common/mongo';
import type { EvalExperimentSchemaType } from '@fastgpt/global/core/evaluation/type';
import { EvaluationStatusEnum, EvaluationStatusValues } from '@fastgpt/global/core/evaluation/constants';

const { Schema } = connectionMongo;

export const EvalExperimentCollectionName = 'eval_experiments';

const EvalExperimentSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  dataset_id: {
    type: String,
    required: true
  },
  target_id: {
    type: String,
    required: true
  },
  evaluator_ids: [{
    type: String,
    required: true
  }],
  status: {
    type: Number,
    default: EvaluationStatusEnum.pending,
    enum: EvaluationStatusValues
  },
  progress: {
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    }
  },
  results: [Object],
  config: Object,
  error: String,
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

EvalExperimentSchema.index({ teamId: 1, status: 1 });
EvalExperimentSchema.index({ teamId: 1, created_at: -1 });

export const MongoEvalExperiment = getMongoModel<EvalExperimentSchemaType>(
  EvalExperimentCollectionName,
  EvalExperimentSchema
);
