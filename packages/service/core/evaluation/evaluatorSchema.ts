import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { connectionMongo, getMongoModel } from '../../common/mongo';
import type { EvaluatorSchemaType } from '@fastgpt/global/core/evaluation/type';

const { Schema } = connectionMongo;

export const EvaluatorCollectionName = 'evaluators';

const EvaluatorSchema = new Schema({
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
  config: {
    type: {
      type: String,
      enum: ['accuracy', 'semantic_similarity', 'custom', 'llm'],
      required: true
    },
    params: {
      // 语义相似度参数
      threshold: Number,
      model: String,
      // 自定义评估器参数
      function: String,
      // LLM评估器参数
      prompt: String,
      model_name: String,
      temperature: Number,
      max_tokens: Number
    }
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
  }
});

EvaluatorSchema.index({ teamId: 1, name: 1 });
EvaluatorSchema.index({ teamId: 1, created_at: -1 });

export const MongoEvaluator = getMongoModel<EvaluatorSchemaType>(
  EvaluatorCollectionName,
  EvaluatorSchema
);
