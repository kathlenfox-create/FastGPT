import { POST, GET, DELETE, PUT } from '@/web/common/api/request';
import type { PaginationProps, PaginationResponse } from '@fastgpt/web/common/fetch/type';
import type {
  EvaluationDataset,
  EvalTarget,
  Evaluator,
  EvalExperiment,
  CreateEvaluationDatasetBody,
  CreateEvalTargetBody,
  CreateEvaluatorBody,
  CreateEvalExperimentBody,
  ListEvaluationDatasetsBody,
  ListEvalTargetsBody,
  ListEvaluatorsBody,
  ListEvalExperimentsBody
} from '@fastgpt/global/core/evaluation/type';

// Evaluation Dataset APIs
export const postCreateEvaluationDataset = (data: CreateEvaluationDatasetBody) =>
  POST<EvaluationDataset>('/core/evaluation/datasets/create', data);

export const getEvaluationDatasetList = (data: ListEvaluationDatasetsBody) =>
  POST<PaginationResponse<EvaluationDataset>>('/core/evaluation/datasets/list', data);

export const getEvaluationDatasetDetail = (id: string) =>
  GET<EvaluationDataset>(`/core/evaluation/datasets/detail?id=${id}`);

export const putUpdateEvaluationDataset = (
  id: string,
  data: Partial<CreateEvaluationDatasetBody>
) => PUT<EvaluationDataset>(`/core/evaluation/datasets/update?id=${id}`, data);

export const deleteEvaluationDataset = (id: string) =>
  DELETE(`/core/evaluation/datasets/delete?id=${id}`);

// Evaluation Target APIs
export const postCreateEvalTarget = (data: CreateEvalTargetBody) =>
  POST<EvalTarget>('/core/evaluation/targets/create', data);

export const getEvalTargetList = (data: ListEvalTargetsBody) =>
  POST<PaginationResponse<EvalTarget>>('/core/evaluation/targets/list', data);

export const getEvalTargetDetail = (id: string) =>
  GET<EvalTarget>(`/core/evaluation/targets/detail?id=${id}`);

export const putUpdateEvalTarget = (id: string, data: Partial<CreateEvalTargetBody>) =>
  PUT<EvalTarget>(`/core/evaluation/targets/update?id=${id}`, data);

export const deleteEvalTarget = (id: string) => DELETE(`/core/evaluation/targets/delete?id=${id}`);

export const postTestEvalTarget = (id: string, testData: any) =>
  POST(`/core/evaluation/targets/test?id=${id}`, testData);

// Evaluator APIs
export const postCreateEvaluator = (data: CreateEvaluatorBody) =>
  POST<Evaluator>('/core/evaluation/evaluators/create', data);

export const getEvaluatorList = (data: ListEvaluatorsBody) =>
  POST<PaginationResponse<Evaluator>>('/core/evaluation/evaluators/list', data);

export const getEvaluatorDetail = (id: string) =>
  GET<Evaluator>(`/core/evaluation/evaluators/detail?id=${id}`);

export const putUpdateEvaluator = (id: string, data: Partial<CreateEvaluatorBody>) =>
  PUT<Evaluator>(`/core/evaluation/evaluators/update?id=${id}`, data);

export const deleteEvaluator = (id: string) =>
  DELETE(`/core/evaluation/evaluators/delete?id=${id}`);

export const postTestEvaluator = (id: string, testData: any) =>
  POST(`/core/evaluation/evaluators/test?id=${id}`, testData);

// Evaluation Experiment APIs
export const postCreateEvalExperiment = (data: CreateEvalExperimentBody) =>
  POST<EvalExperiment>('/core/evaluation/experiments/create', data);

export const getEvalExperimentList = (data: ListEvalExperimentsBody) =>
  POST<PaginationResponse<EvalExperiment>>('/core/evaluation/experiments/list', data);

export const getEvalExperimentDetail = (id: string) =>
  GET<EvalExperiment>(`/core/evaluation/experiments/detail?id=${id}`);

export const putUpdateEvalExperiment = (id: string, data: Partial<CreateEvalExperimentBody>) =>
  PUT<EvalExperiment>(`/core/evaluation/experiments/update?id=${id}`, data);

export const deleteEvalExperiment = (id: string) =>
  DELETE(`/core/evaluation/experiments/delete?id=${id}`);

export const postStartEvalExperiment = (id: string) =>
  POST(`/core/evaluation/experiments/start?id=${id}`);

export const postCancelEvalExperiment = (id: string) =>
  POST(`/core/evaluation/experiments/cancel?id=${id}`);
