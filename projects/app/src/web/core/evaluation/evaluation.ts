import { DELETE, POST } from '@/web/common/api/request';
import type {
  listEvalItemsBody,
  listEvaluationsBody,
  retryEvalItemBody,
  updateEvalItemBody
} from '@fastgpt/global/core/evaluation/api';
import { EvaluationStatusEnum } from '@fastgpt/global/core/evaluation/constants';
import type { evaluationType, listEvalItemsItem } from '@fastgpt/global/core/evaluation/type';
import type { PaginationResponse } from '@fastgpt/web/common/fetch/type';
import { PaginatedResultSchema } from '@modelcontextprotocol/sdk/types';

const mockPromise = <T>(data: T, timeout = 500) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data), timeout));

// Mock data for listEvalItemsItem
const mockEvalItems: listEvalItemsItem[] = [
  {
    evalItemId: 'item1',
    evalId: 'eval1',
    question: 'What is the capital of France?',
    expectedResponse: 'Paris',
    globalVariables: { region: 'Europe' },
    history: 'Previous question: What is the capital of Spain?',
    response: 'Paris',
    responseTime: new Date('2025-08-10T10:00:00Z'),
    finishTime: new Date('2025-08-10T10:01:00Z'),
    status: EvaluationStatusEnum.completed,
    retry: 0,
    accuracy: 1.0,
    relevance: 0.95,
    semanticAccuracy: 0.98,
    score: 0.97
  },
  {
    evalItemId: 'item2',
    evalId: 'eval1',
    question: 'What is 2 + 2?',
    expectedResponse: '4',
    response: '4',
    status: EvaluationStatusEnum.completed,
    retry: 0,
    accuracy: 1.0,
    score: 1.0
  }
];

// Mock data for evaluationType
const mockEvaluations: evaluationType[] = [
  {
    _id: 'eval1',
    name: 'Geography Quiz',
    appId: 'app1',
    createTime: new Date('2025-08-09T09:00:00Z'),
    finishTime: new Date('2025-08-09T10:00:00Z'),
    evalModel: 'gpt-4',
    score: 0.95,
    executorAvatar: 'https://example.com/avatar1.png',
    executorName: 'John Doe',
    appAvatar: 'https://example.com/app1.png',
    appName: 'QuizApp',
    completedCount: 10,
    errorCount: 0,
    totalCount: 10
  },
  {
    _id: 'eval2',
    name: 'Math Test',
    appId: 'app2',
    createTime: new Date('2025-08-08T08:00:00Z'),
    evalModel: 'llama-3',
    score: 0.9,
    executorAvatar: 'https://example.com/avatar2.png',
    executorName: 'Jane Smith',
    appAvatar: 'https://example.com/app2.png',
    appName: 'MathApp',
    completedCount: 8,
    errorCount: 1,
    totalCount: 9
  }
];

export const postCreateEvaluation = ({
  file,
  name,
  evalModel,
  appId,
  percentListen
}: {
  file: File;
  name: string;
  evalModel: string;
  appId: string;
  percentListen: (percent: number) => void;
}) => {
  const formData = new FormData();
  formData.append('file', file, encodeURIComponent(file.name));
  formData.append('data', JSON.stringify({ name, evalModel, appId }));

  return POST(`/core/evaluation/create`, formData, {
    timeout: 600000,
    onUploadProgress: (e) => {
      if (!e.total) return;

      const percent = Math.round((e.loaded / e.total) * 100);
      percentListen?.(percent);
    },
    headers: {
      'Content-Type': 'multipart/form-data; charset=utf-8'
    }
  });
  // return new Promise<{ success: boolean; evalId: string }>((resolve) => {
  //   let progress = 0;
  //   const intervalId = setInterval(() => {
  //     progress += 10;
  //     percentListen(progress);
  //     if (progress >= 100) {
  //       clearInterval(intervalId);
  //       resolve({ success: true, evalId: 'mock_eval_id' });
  //     }
  //   }, 30);
  // });
};

export const getEvaluationList = (data: listEvaluationsBody) =>
  POST<PaginationResponse<evaluationType>>('/core/evaluation/list', data);
// mockPromise<PaginationResponse<evaluationType>>({
//   total: mockEvaluations.length,
//   list: mockEvaluations
//     .filter((evaluation) => !data.appId || evaluation.appId === data.appId)
//     .slice(
//       ((data.page || 1) - 1) * (data.size || 10),
//       (data.page || 1) * (data.size || 10)
//     ),
// });

export const deleteEvaluation = (data: { evalId: string }) =>
  DELETE('/core/evaluation/delete', data);
// mockPromise({ success: true });

export const getEvalItemsList = (data: listEvalItemsBody) =>
  POST<PaginationResponse<listEvalItemsItem>>('/core/evaluation/listItems', data);
// mockPromise<PaginationResponse<listEvalItemsItem>>({
//   total: mockEvalItems.length,
//   list: mockEvalItems.filter((item) => item.evalId === data.evalId).slice(
//     ((data.page || 1) - 1) * (data.size || 10),
//     (data.page || 1) * (data.size || 10)
//   ),
// });

export const deleteEvalItem = (data: { evalItemId: string }) =>
  DELETE('/core/evaluation/deleteItem', data);
// mockPromise({ success: true });

export const retryEvalItem = (data: retryEvalItemBody) => POST('/core/evaluation/retryItem', data);
// mockPromise({ success: true });

export const updateEvalItem = (data: updateEvalItemBody) =>
  POST('/core/evaluation/updateItem', data);
// mockPromise({ success: true });
