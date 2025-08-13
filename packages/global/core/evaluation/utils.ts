import { EvaluationData, EvaluationDataset } from './type';

// 验证评估数据
export function validateEvaluationData(data: EvaluationData): void {
  if (!data.id?.trim()) {
    throw new Error('Evaluation data ID is required');
  }
  
  if (!data.user_input?.trim()) {
    throw new Error('User input is required');
  }
  
  if (!data.expected_output?.trim()) {
    throw new Error('Expected output is required');
  }
}

// 验证评估数据集
export function validateEvaluationDataset(dataset: Partial<EvaluationDataset>): void {
  if (!dataset.name?.trim()) {
    throw new Error('Dataset name is required');
  }
  
  if (!dataset.version?.trim()) {
    throw new Error('Dataset version is required');
  }
  
  if (!Array.isArray(dataset.data)) {
    throw new Error('Dataset data must be an array');
  }
  
  dataset.data?.forEach((item, index) => {
    try {
      validateEvaluationData(item);
    } catch (error) {
      throw new Error(`Invalid data at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 计算简单余弦相似度
export function calculateSimpleCosineSimilarity(text1: string, text2: string): number {
  const getWordFreq = (text: string): Map<string, number> => {
    const words = text.toLowerCase().split(/\s+/);
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    return freq;
  };
  
  const freq1 = getWordFreq(text1);
  const freq2 = getWordFreq(text2);
  
  const allWords = new Set([...freq1.keys(), ...freq2.keys()]);
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const word of allWords) {
    const f1 = freq1.get(word) || 0;
    const f2 = freq2.get(word) || 0;
    
    dotProduct += f1 * f2;
    norm1 += f1 * f1;
    norm2 += f2 * f2;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// 格式化评估分数
export function formatScore(score: number): string {
  return (score * 100).toFixed(2) + '%';
}

// 获取评估状态文本
export function getEvaluationStatusText(status: number): string {
  const statusMap = {
    0: 'pending',
    1: 'running', 
    2: 'completed',
    3: 'failed',
    4: 'cancelled'
  };
  return statusMap[status as keyof typeof statusMap] || 'unknown';
}

// 计算评估统计信息
export function calculateEvaluationStats(results: any[]): {
  total: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_score: number;
} {
  const total = results.length;
  const completed = results.filter(r => r.status === 2).length;
  const failed = results.filter(r => r.status === 3).length;
  const success_rate = total > 0 ? completed / total : 0;
  
  const validScores = results
    .filter(r => r.status === 2 && typeof r.score === 'number')
    .map(r => r.score);
  const avg_score = validScores.length > 0 
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
    : 0;
  
  return {
    total,
    completed,
    failed,
    success_rate,
    avg_score
  };
}
