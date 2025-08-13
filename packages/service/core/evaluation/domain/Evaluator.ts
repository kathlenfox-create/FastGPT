import { Evaluator as IEvaluator, EvaluatorConfig, EvaluationResult } from '@fastgpt/global/core/evaluation/type';
import { generateId, calculateSimpleCosineSimilarity } from '@fastgpt/global/core/evaluation/utils';

export class Evaluator implements IEvaluator {
  public readonly id: string;
  public name: string;
  public description?: string;
  public config: EvaluatorConfig;
  public readonly created_at: Date;
  public updated_at: Date;
  public teamId: string;
  public tmbId: string;

  constructor(props: Omit<IEvaluator, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
    this.id = props.id || generateId();
    this.name = props.name;
    this.description = props.description;
    this.config = props.config;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.teamId = props.teamId;
    this.tmbId = props.tmbId;
    
    this.validate();
  }

  private validate(): void {
    if (!this.name?.trim()) {
      throw new Error('Evaluator name is required');
    }
    
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config?.type) {
      throw new Error('Evaluator config type is required');
    }
    
    switch (this.config.type) {
      case 'accuracy':
      case 'semantic_similarity':
        // 这些类型不需要额外验证
        break;
      case 'custom':
        if (!this.config.params?.function) {
          throw new Error('Custom evaluator requires a function parameter');
        }
        break;
      case 'llm':
        if (!this.config.params?.prompt) {
          throw new Error('LLM evaluator requires a prompt parameter');
        }
        break;
      default:
        throw new Error(`Unsupported evaluator type: ${this.config.type}`);
    }
  }

  public async evaluate(
    actual_output: string,
    expected_output: string,
    context?: {
      user_input?: string;
      retrieval_context?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Pick<EvaluationResult, 'score' | 'details' | 'execution_time_ms'>> {
    const startTime = Date.now();
    
    try {
      let result: { score: number; details?: Record<string, any> };
      
      switch (this.config.type) {
        case 'accuracy':
          result = this.evaluateAccuracy(actual_output, expected_output);
          break;
        case 'semantic_similarity':
          result = await this.evaluateSemanticSimilarity(actual_output, expected_output);
          break;
        case 'custom':
          result = await this.evaluateCustom(actual_output, expected_output, context);
          break;
        case 'llm':
          result = await this.evaluateLLM(actual_output, expected_output, context);
          break;
        default:
          throw new Error(`Unsupported evaluator type: ${this.config.type}`);
      }
      
      return {
        score: result.score,
        details: result.details,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private evaluateAccuracy(actual: string, expected: string): { score: number; details: Record<string, any> } {
    const normalizeText = (text: string) => text.trim().toLowerCase();
    
    const normalizedActual = normalizeText(actual);
    const normalizedExpected = normalizeText(expected);
    
    const exactMatch = normalizedActual === normalizedExpected;
    const score = exactMatch ? 1.0 : 0.0;
    
    return {
      score,
      details: {
        exact_match: exactMatch,
        actual_length: actual.length,
        expected_length: expected.length,
        case_sensitive_match: actual === expected
      }
    };
  }

  private async evaluateSemanticSimilarity(
    actual: string, 
    expected: string
  ): Promise<{ score: number; details: Record<string, any> }> {
    const threshold = this.config.params?.threshold || 0.8;
    const model = this.config.params?.model || 'simple';
    
    let similarity: number;
    
    if (model === 'simple') {
      similarity = calculateSimpleCosineSimilarity(actual, expected);
    } else {
      throw new Error(`Unsupported similarity model: ${model}`);
    }
    
    const score = similarity >= threshold ? 1.0 : similarity;
    
    return {
      score,
      details: {
        similarity,
        threshold,
        model,
        passes_threshold: similarity >= threshold
      }
    };
  }

  private async evaluateCustom(
    actual: string,
    expected: string,
    context?: Record<string, any>
  ): Promise<{ score: number; details: Record<string, any> }> {
    const customFunction = this.config.params?.function;
    if (!customFunction) {
      throw new Error('Custom evaluator requires a function parameter');
    }
    
    if (typeof customFunction === 'function') {
      const result = await customFunction(actual, expected, context, this.config.params);
      
      if (typeof result === 'number') {
        return { score: result, details: {} };
      }
      
      if (typeof result === 'object' && typeof result.score === 'number') {
        return result;
      }
      
      throw new Error('Custom function must return a number or object with score property');
    }
    
    throw new Error('Custom evaluator function must be a callable function');
  }

  private async evaluateLLM(
    actual: string,
    expected: string,
    context?: Record<string, any>
  ): Promise<{ score: number; details: Record<string, any> }> {
    const prompt = this.config.params?.prompt;
    const modelName = this.config.params?.model_name || 'gpt-3.5-turbo';
    const temperature = this.config.params?.temperature || 0.1;
    const maxTokens = this.config.params?.max_tokens || 100;
    
    if (!prompt) {
      throw new Error('LLM evaluator requires a prompt parameter');
    }
    
    try {
      // 这里需要调用FastGPT的LLM API
      // 暂时返回模拟评分
      const mockScore = Math.random() * 0.3 + 0.7; // 0.7-1.0之间的随机分数
      
      return {
        score: mockScore,
        details: {
          model: modelName,
          temperature,
          max_tokens: maxTokens,
          prompt_length: prompt.length
        }
      };
    } catch (error) {
      throw new Error(`LLM evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public updateConfig(config: EvaluatorConfig): void {
    this.config = config;
    this.validateConfig();
    this.updated_at = new Date();
  }

  public async test(
    sampleActual: string,
    sampleExpected: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await this.evaluate(sampleActual, sampleExpected);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
