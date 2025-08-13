import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { connectionMongo, getMongoModel } from '../../../common/mongo';
import type { EvaluationDatasetSchemaType } from '@fastgpt/global/core/evaluation/type';

const { Schema } = connectionMongo;

export const EvaluationDatasetCollectionName = 'evaluation_datasets';

const EvaluationDatasetSchema = new Schema({
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
  version: {
    type: String,
    required: true
  },
  data: [{
    id: {
      type: String,
      required: true
    },
    user_input: {
      type: String,
      required: true
    },
    actual_output: String,
    expected_output: {
      type: String,
      required: true
    },
    context: String,
    retrieval_context: String,
    metadata: Object,
    scenario: String,
    persona: String
  }],
  tags: [String],
  source_type: {
    type: String,
    enum: ['manual', 'jsonl', 'excel', 'huggingface', 'generated'],
    default: 'manual'
  },
  source_config: Object,
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

EvaluationDatasetSchema.index({ teamId: 1, name: 1 });
EvaluationDatasetSchema.index({ teamId: 1, created_at: -1 });

export const MongoEvaluationDataset = getMongoModel<EvaluationDatasetSchemaType>(
  EvaluationDatasetCollectionName,
  EvaluationDatasetSchema
);
