import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { connectionMongo, getMongoModel } from '../../../common/mongo';
import type { EvalTargetSchemaType } from '@fastgpt/global/core/evaluation/type';

const { Schema } = connectionMongo;

export const EvalTargetCollectionName = 'eval_targets';

const EvalTargetSchema = new Schema({
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
      enum: ['mock', 'http', 'function', 'app'],
      required: true
    },
    config: {
      // Mock配置
      responses: [{
        input_pattern: String,
        output: String,
        delay: Number
      }],
      // HTTP配置
      url: String,
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE']
      },
      headers: Object,
      timeout: Number,
      retry_count: Number,
      // Function配置
      module_path: String,
      function_name: String,
      args: [Schema.Types.Mixed],
      kwargs: Object,
      // App配置
      appId: Schema.Types.ObjectId,
      chatModel: String,
      variables: Object
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

EvalTargetSchema.index({ teamId: 1, name: 1 });
EvalTargetSchema.index({ teamId: 1, created_at: -1 });

export const MongoEvalTarget = getMongoModel<EvalTargetSchemaType>(
  EvalTargetCollectionName,
  EvalTargetSchema
);
