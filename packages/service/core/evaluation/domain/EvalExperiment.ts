import type {
  EvalExperiment as IEvalExperiment,
  EvaluationResult,
  EvalTask as IEvalTask
} from '@fastgpt/global/core/evaluation/type';
import { generateId, TASK_RETRY_CONFIG } from '@fastgpt/global/core/evaluation/utils';
import type { EvaluationDataset } from './EvaluationDataset';
import type { EvalTarget } from './EvalTarget';
import type { Evaluator } from './Evaluator';
import { EvalChain, EvalChainResult } from './EvalChain';

export class EvalTask implements IEvalTask {
  public readonly id: string;
  public experiment_id: string;
  public evaluation_data_id: string;
  public target_id: string;
  public evaluator_id: string;
  public status: 'pending' | 'running' | 'completed' | 'failed';
  public result?: EvaluationResult;
  public error?: string;
  public retry_count: number;
  public max_retries: number;
  public readonly created_at: Date;
  public updated_at: Date;
  public started_at?: Date;
  public completed_at?: Date;

  constructor(props: Omit<IEvalTask, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
    this.id = props.id || generateId();
    this.experiment_id = props.experiment_id;
    this.evaluation_data_id = props.evaluation_data_id;
    this.target_id = props.target_id;
    this.evaluator_id = props.evaluator_id;
    this.status = props.status || 'pending';
    this.result = props.result;
    this.error = props.error;
    this.retry_count = props.retry_count || 0;
    this.max_retries = props.max_retries || TASK_RETRY_CONFIG.MAX_RETRIES;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.started_at = props.started_at;
    this.completed_at = props.completed_at;
  }

  public start(): void {
    this.status = 'running';
    this.started_at = new Date();
    this.updated_at = new Date();
  }

  public complete(result: EvaluationResult): void {
    this.status = 'completed';
    this.result = result;
    this.completed_at = new Date();
    this.updated_at = new Date();
  }

  public fail(error: string): void {
    this.status = 'failed';
    this.error = error;
    this.completed_at = new Date();
    this.updated_at = new Date();
  }

  public retry(): void {
    this.retry_count++;
    this.status = 'pending';
    this.error = undefined;
    this.updated_at = new Date();
  }

  public canRetry(): boolean {
    return this.retry_count < this.max_retries;
  }
}

export class EvalExperiment implements IEvalExperiment {
  public readonly id: string;
  public name: string;
  public description?: string;
  public dataset_id: string;
  public target_id: string;
  public evaluator_ids: string[];
  public status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  public progress: {
    total: number;
    completed: number;
    failed: number;
  };
  public results: any;
  public config?: Record<string, any>;
  public error?: string;
  public readonly created_at: Date;
  public updated_at: Date;
  public started_at?: Date;
  public completed_at?: Date;
  public teamId: string;
  public tmbId: string;

  private tasks: EvalTask[] = [];

  constructor(props: Omit<IEvalExperiment, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
    this.id = props.id || generateId();
    this.name = props.name;
    this.description = props.description;
    this.dataset_id = props.dataset_id;
    this.target_id = props.target_id;
    this.evaluator_ids = props.evaluator_ids;
    this.status = props.status || 'pending';
    this.progress = props.progress || { total: 0, completed: 0, failed: 0 };
    this.results = props.results || [];
    this.config = props.config;
    this.error = props.error;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.started_at = props.started_at;
    this.completed_at = props.completed_at;
    this.teamId = props.teamId;
    this.tmbId = props.tmbId;
  }

  public initializeTasks(dataset: EvaluationDataset): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot initialize tasks for experiment in ${this.status} status`);
    }

    this.tasks = [];
    const totalTasks = dataset.data.length * this.evaluator_ids.length;

    for (const dataItem of dataset.data) {
      for (const evaluatorId of this.evaluator_ids) {
        const task = new EvalTask({
          experiment_id: this.id,
          evaluation_data_id: dataItem.id,
          target_id: this.target_id,
          evaluator_id: evaluatorId,
          status: 'pending',
          retry_count: 0,
          max_retries: this.config?.max_retries || TASK_RETRY_CONFIG.MAX_RETRIES
        });
        this.tasks.push(task);
      }
    }

    this.progress = {
      total: totalTasks,
      completed: 0,
      failed: 0
    };
    this.updated_at = new Date();
  }

  public start(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot start experiment in ${this.status} status`);
    }

    this.status = 'running';
    this.started_at = new Date();
    this.updated_at = new Date();
  }

  public cancel(): void {
    if (this.status !== 'pending' && this.status !== 'running') {
      throw new Error(`Cannot cancel experiment in ${this.status} status`);
    }

    this.status = 'cancelled';
    this.completed_at = new Date();
    this.updated_at = new Date();
  }

  public async execute(
    dataset: EvaluationDataset,
    target: EvalTarget,
    evaluators: Evaluator[],
    options?: {
      parallel?: boolean;
      batch_size?: number;
      progress_callback?: (experiment: EvalExperiment) => void;
    }
  ): Promise<void> {
    if (this.tasks.length === 0) {
      this.initializeTasks(dataset);
    }

    this.start();

    const evaluatorMap = new Map(evaluators.map((e) => [e.id, e]));
    const dataMap = new Map(dataset.data.map((d) => [d.id, d]));

    try {
      if (options?.parallel) {
        await this.executeParallel(dataMap, target, evaluatorMap, options);
      } else {
        await this.executeSequential(dataMap, target, evaluatorMap, options);
      }

      this.status = this.progress.failed > 0 ? 'failed' : 'completed';
    } catch (error) {
      this.status = 'failed';
      throw error;
    } finally {
      this.completed_at = new Date();
      this.updated_at = new Date();
    }
  }

  private async executeParallel(
    dataMap: Map<string, any>,
    target: EvalTarget,
    evaluatorMap: Map<string, Evaluator>,
    options?: any
  ): Promise<void> {
    const batchSize = options?.batch_size || 5;
    const pendingTasks = this.tasks.filter((task) => task.status === 'pending');

    for (let i = 0; i < pendingTasks.length; i += batchSize) {
      const batch = pendingTasks.slice(i, i + batchSize);
      const batchPromises = batch.map((task) =>
        this.executeTask(task, dataMap, target, evaluatorMap)
      );

      await Promise.allSettled(batchPromises);

      if (options?.progress_callback) {
        options.progress_callback(this);
      }
    }
  }

  private async executeSequential(
    dataMap: Map<string, any>,
    target: EvalTarget,
    evaluatorMap: Map<string, Evaluator>,
    options?: any
  ): Promise<void> {
    const pendingTasks = this.tasks.filter((task) => task.status === 'pending');

    for (const task of pendingTasks) {
      await this.executeTask(task, dataMap, target, evaluatorMap);

      if (options?.progress_callback) {
        options.progress_callback(this);
      }
    }
  }

  private async executeTask(
    task: EvalTask,
    dataMap: Map<string, any>,
    target: EvalTarget,
    evaluatorMap: Map<string, Evaluator>
  ): Promise<void> {
    const evaluationData = dataMap.get(task.evaluation_data_id);
    const evaluator = evaluatorMap.get(task.evaluator_id);

    if (!evaluationData || !evaluator) {
      task.fail('Missing evaluation data or evaluator');
      this.progress.failed++;
      this.updated_at = new Date();
      return;
    }

    let attempts = 0;

    while (attempts <= task.max_retries) {
      try {
        task.start();

        const chain = new EvalChain(target, [evaluator]);
        const chainResult = await chain.execute(evaluationData, {
          timeout_ms: this.config?.timeout_ms || 30000,
          retry_on_failure: false
        });

        if (chainResult.success && chainResult.evaluation_results.length > 0) {
          const result = chainResult.evaluation_results[0];
          task.complete(result);
          this.results.push(result);
          this.progress.completed++;
          break;
        } else {
          throw new Error(chainResult.error || 'Evaluation failed without error');
        }
      } catch (error) {
        attempts++;

        if (attempts > task.max_retries) {
          task.fail(error instanceof Error ? error.message : String(error));
          this.progress.failed++;
          break;
        } else {
          task.retry();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              TASK_RETRY_CONFIG.INITIAL_DELAY_MS *
                Math.pow(TASK_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempts - 1)
            )
          );
        }
      }
    }

    this.updated_at = new Date();
  }

  public getTasks(): EvalTask[] {
    return [...this.tasks];
  }

  public getTaskById(taskId: string): EvalTask | undefined {
    return this.tasks.find((task) => task.id === taskId);
  }

  public getStatistics(): {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    success_rate: number;
    avg_score: number;
  } {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.status === 'completed').length;
    const failedTasks = this.tasks.filter((t) => t.status === 'failed').length;
    const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const validScores = this.results
      .filter((r: any) => r.score !== undefined && r.score !== null)
      .map((r: any) => r.score);
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length
        : 0;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      failed_tasks: failedTasks,
      success_rate: successRate,
      avg_score: avgScore
    };
  }
}
