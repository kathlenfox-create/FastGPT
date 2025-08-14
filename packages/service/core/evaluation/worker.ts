import { addLog } from '../../common/system/log';
import { MongoEvalExperiment } from './evalExperimentSchema';
import { MongoEvaluationDataset } from './evaluationDatasetSchema';
import { MongoEvalTarget } from './evalTargetSchema';
import { MongoEvaluator } from './evaluatorSchema';
import { EvalExperiment } from './domain/EvalExperiment';
import { EvaluationDataset } from './domain/EvaluationDataset';
import { EvalTarget } from './domain/EvalTarget';
import { Evaluator } from './domain/Evaluator';
import type { EvaluationExperimentJobData } from './mq';

export async function processEvaluationExperiment(job: { data: EvaluationExperimentJobData }) {
  const { experimentId } = job.data;

  try {
    addLog.info('Starting evaluation experiment processing', { experimentId });

    // Get experiment from database
    const dbExperiment = await MongoEvalExperiment.findById(experimentId);
    if (!dbExperiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Check if experiment is already running or completed
    if (dbExperiment.status === 'running') {
      addLog.warn('Experiment is already running', { experimentId });
      return;
    }

    if (dbExperiment.status === 'completed' || dbExperiment.status === 'failed') {
      addLog.warn('Experiment is already completed or failed', {
        experimentId,
        status: dbExperiment.status
      });
      return;
    }

    // Get dataset
    const dbDataset = await MongoEvaluationDataset.findById(dbExperiment.dataset_id);
    if (!dbDataset) {
      throw new Error(`Dataset not found: ${dbExperiment.dataset_id}`);
    }

    // Get target
    const dbTarget = await MongoEvalTarget.findById(dbExperiment.target_id);
    if (!dbTarget) {
      throw new Error(`Target not found: ${dbExperiment.target_id}`);
    }

    // Get evaluators
    const dbEvaluators = await MongoEvaluator.find({
      _id: { $in: dbExperiment.evaluator_ids }
    });
    if (dbEvaluators.length !== dbExperiment.evaluator_ids.length) {
      throw new Error(`Some evaluators not found for experiment: ${experimentId}`);
    }

    // Create domain objects
    const dataset = new EvaluationDataset({
      id: dbDataset._id.toString(),
      name: dbDataset.name,
      description: dbDataset.description,
      version: dbDataset.version,
      data: dbDataset.data,
      tags: dbDataset.tags,
      source_type: dbDataset.source_type,
      source_config: dbDataset.source_config,
      teamId: dbDataset.teamId,
      tmbId: dbDataset.tmbId
    });

    const target = new EvalTarget({
      id: dbTarget._id.toString(),
      name: dbTarget.name,
      description: dbTarget.description,
      config: dbTarget.config,
      teamId: dbTarget.teamId,
      tmbId: dbTarget.tmbId
    });

    const evaluators = dbEvaluators.map(
      (dbEvaluator) =>
        new Evaluator({
          id: dbEvaluator._id.toString(),
          name: dbEvaluator.name,
          description: dbEvaluator.description,
          config: dbEvaluator.config,
          teamId: dbEvaluator.teamId,
          tmbId: dbEvaluator.tmbId
        })
    );

    const experiment = new EvalExperiment({
      id: dbExperiment._id.toString(),
      name: dbExperiment.name,
      description: dbExperiment.description,
      dataset_id: dbExperiment.dataset_id,
      target_id: dbExperiment.target_id,
      evaluator_ids: dbExperiment.evaluator_ids,
      config: dbExperiment.config,
      teamId: dbExperiment.teamId,
      tmbId: dbExperiment.tmbId,
      status: dbExperiment.status || 'pending',
      progress: dbExperiment.progress || { total: 0, completed: 0, failed: 0 },
      results: dbExperiment.results || []
    });

    // Update experiment status to running
    await MongoEvalExperiment.findByIdAndUpdate(experimentId, {
      status: 'running',
      started_at: new Date(),
      updated_at: new Date()
    });

    addLog.info('Starting experiment execution', { experimentId });

    // Execute the experiment
    await experiment.execute(dataset, target, evaluators, {
      parallel: true,
      batch_size: 10,
      progress_callback: async (updatedExperiment) => {
        // Update progress in database
        await MongoEvalExperiment.findByIdAndUpdate(experimentId, {
          status: updatedExperiment.status,
          progress: updatedExperiment.progress,
          results: updatedExperiment.results,
          updated_at: updatedExperiment.updated_at
        });
      }
    });

    // Update final status
    await MongoEvalExperiment.findByIdAndUpdate(experimentId, {
      status: experiment.status,
      progress: experiment.progress,
      results: experiment.results,
      completed_at: experiment.completed_at,
      updated_at: experiment.updated_at
    });

    addLog.info('Evaluation experiment completed', {
      experimentId,
      status: experiment.status,
      completed: experiment.progress.completed,
      failed: experiment.progress.failed
    });
  } catch (error) {
    addLog.error('Error processing evaluation experiment', { experimentId, error });

    // Update experiment status to failed
    try {
      await MongoEvalExperiment.findByIdAndUpdate(experimentId, {
        status: 'failed',
        updated_at: new Date()
      });
    } catch (updateError) {
      addLog.error('Failed to update experiment status to failed', { experimentId, updateError });
    }

    throw error;
  }
}
