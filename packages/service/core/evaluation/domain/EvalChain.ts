import { EvaluationData, EvaluationResult } from '@fastgpt/global/core/evaluation/type';
import { generateId } from '@fastgpt/global/core/evaluation/utils';
import { EvalTarget } from './EvalTarget';
import { Evaluator } from './Evaluator';

export interface EvalChainResult {
  evaluation_data_id: string;
  target_output: string;
  evaluation_results: EvaluationResult[];
  execution_time_ms: number;
  success: boolean;
  error?: string;
}

export interface EvalChainContext {
  timeout_ms?: number;
  retry_on_failure?: boolean;
  hooks?: {
    before_target?: (data: EvaluationData) => Promise<void> | void;
    after_target?: (data: EvaluationData, output: string) => Promise<void> | void;
    before_evaluation?: (evaluator: Evaluator, actual: string, expected: string) => Promise<void> | void;
    after_evaluation?: (evaluator: Evaluator, result: EvaluationResult) => Promise<void> | void;
    on_error?: (error: Error, step: string) => Promise<void> | void;
  };
}

export class EvalChain {
  constructor(
    private target: EvalTarget,
    private evaluators: Evaluator[]
  ) {
    if (!target) {
      throw new Error('EvalTarget is required');
    }
    if (!evaluators || evaluators.length === 0) {
      throw new Error('At least one Evaluator is required');
    }
  }

  public async execute(
    evaluationData: EvaluationData,
    context?: EvalChainContext
  ): Promise<EvalChainResult> {
    const startTime = Date.now();
    const result: EvalChainResult = {
      evaluation_data_id: evaluationData.id,
      target_output: '',
      evaluation_results: [],
      execution_time_ms: 0,
      success: false
    };

    try {
      await this.executeHook(context?.hooks?.before_target, evaluationData);
      
      result.target_output = await this.executeTarget(evaluationData, context);
      
      await this.executeHook(context?.hooks?.after_target, evaluationData, result.target_output);
      
      result.evaluation_results = await this.executeEvaluations(
        evaluationData,
        result.target_output,
        context
      );
      
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      await this.executeHook(context?.hooks?.on_error, error, 'evaluation');
    } finally {
      result.execution_time_ms = Date.now() - startTime;
    }

    return result;
  }

  private async executeTarget(
    evaluationData: EvaluationData,
    context?: EvalChainContext
  ): Promise<string> {
    const timeout = context?.timeout_ms || 30000;
    
    const targetPromise = this.target.invoke(evaluationData.user_input, {
      context: evaluationData.context,
      retrieval_context: evaluationData.retrieval_context,
      metadata: evaluationData.metadata
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Target execution timeout after ${timeout}ms`)), timeout);
    });

    try {
      return await Promise.race([targetPromise, timeoutPromise]);
    } catch (error) {
      if (context?.retry_on_failure) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.target.invoke(evaluationData.user_input, {
          context: evaluationData.context,
          retrieval_context: evaluationData.retrieval_context,
          metadata: evaluationData.metadata
        });
      }
      throw error;
    }
  }

  private async executeEvaluations(
    evaluationData: EvaluationData,
    actualOutput: string,
    context?: EvalChainContext
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    for (const evaluator of this.evaluators) {
      try {
        await this.executeHook(
          context?.hooks?.before_evaluation,
          evaluator,
          actualOutput,
          evaluationData.expected_output
        );
        
        const evalResult = await evaluator.evaluate(
          actualOutput,
          evaluationData.expected_output,
          {
            user_input: evaluationData.user_input,
            retrieval_context: evaluationData.retrieval_context,
            metadata: evaluationData.metadata
          }
        );
        
        const fullResult: EvaluationResult = {
          id: generateId(),
          evaluation_data_id: evaluationData.id,
          evaluator_id: evaluator.id,
          score: evalResult.score,
          details: evalResult.details,
          execution_time_ms: evalResult.execution_time_ms,
          created_at: new Date()
        };
        
        results.push(fullResult);
        
        await this.executeHook(context?.hooks?.after_evaluation, evaluator, fullResult);
      } catch (error) {
        const errorResult: EvaluationResult = {
          id: generateId(),
          evaluation_data_id: evaluationData.id,
          evaluator_id: evaluator.id,
          score: 0,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: 0,
          created_at: new Date()
        };
        
        results.push(errorResult);
        await this.executeHook(context?.hooks?.on_error, error, `evaluation-${evaluator.id}`);
      }
    }
    
    return results;
  }

  private async executeHook(hook: Function | undefined, ...args: any[]): Promise<void> {
    if (hook && typeof hook === 'function') {
      try {
        await hook(...args);
      } catch (error) {
        console.warn('Hook execution failed:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  public async executeBatch(
    evaluationDataList: EvaluationData[],
    context?: EvalChainContext & {
      parallel?: boolean;
      batch_size?: number;
      progress_callback?: (completed: number, total: number) => void;
    }
  ): Promise<EvalChainResult[]> {
    const results: EvalChainResult[] = [];
    const total = evaluationDataList.length;
    
    if (context?.parallel) {
      const batchSize = context.batch_size || 5;
      
      for (let i = 0; i < evaluationDataList.length; i += batchSize) {
        const batch = evaluationDataList.slice(i, i + batchSize);
        const batchPromises = batch.map(data => this.execute(data, context));
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              evaluation_data_id: '',
              target_output: '',
              evaluation_results: [],
              execution_time_ms: 0,
              success: false,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason)
            });
          }
        }
        
        if (context.progress_callback) {
          context.progress_callback(results.length, total);
        }
      }
    } else {
      for (let i = 0; i < evaluationDataList.length; i++) {
        const result = await this.execute(evaluationDataList[i], context);
        results.push(result);
        
        if (context?.progress_callback) {
          context.progress_callback(i + 1, total);
        }
      }
    }
    
    return results;
  }

  public getStatistics(results: EvalChainResult[]): {
    total: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_execution_time_ms: number;
    evaluator_stats: Array<{
      evaluator_id: string;
      avg_score: number;
      count: number;
    }>;
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length;
    
    const evaluatorMap = new Map<string, { scores: number[]; count: number }>();
    
    for (const result of results) {
      if (result.success) {
        for (const evalResult of result.evaluation_results) {
          if (!evalResult.error) {
            const stats = evaluatorMap.get(evalResult.evaluator_id) || { scores: [], count: 0 };
            stats.scores.push(evalResult.score);
            stats.count++;
            evaluatorMap.set(evalResult.evaluator_id, stats);
          }
        }
      }
    }
    
    const evaluatorStats = Array.from(evaluatorMap.entries()).map(([id, stats]) => ({
      evaluator_id: id,
      avg_score: stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length,
      count: stats.count
    }));
    
    return {
      total: results.length,
      successful,
      failed,
      success_rate: successful / results.length,
      avg_execution_time_ms: avgExecutionTime,
      evaluator_stats: evaluatorStats
    };
  }
}
