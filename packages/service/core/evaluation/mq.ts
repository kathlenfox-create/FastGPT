import { getQueue, getWorker, QueueNames } from '../../common/bullmq';
import { type Processor } from 'bullmq';
import { addLog } from '../../common/system/log';

export type EvaluationExperimentJobData = {
  experimentId: string;
};

export const evaluationExperimentQueue = getQueue<EvaluationExperimentJobData>(QueueNames.evaluationExperiment, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

const concurrency = process.env.EVAL_EXPERIMENT_CONCURRENCY ? Number(process.env.EVAL_EXPERIMENT_CONCURRENCY) : 2;
export const getEvaluationExperimentWorker = (processor: Processor<EvaluationExperimentJobData>) => {
  return getWorker<EvaluationExperimentJobData>(QueueNames.evaluationExperiment, processor, {
    removeOnFail: {
      count: 1000 // Keep last 1000 failed jobs
    },
    concurrency: concurrency
  });
};

export const addEvaluationExperimentJob = (data: EvaluationExperimentJobData) => {
  const experimentId = String(data.experimentId);

  return evaluationExperimentQueue.add(experimentId, data, { deduplication: { id: experimentId } });
};

export const checkEvaluationExperimentJobActive = async (experimentId: string): Promise<boolean> => {
  try {
    const jobId = await evaluationExperimentQueue.getDeduplicationJobId(String(experimentId));
    if (!jobId) return false;

    const job = await evaluationExperimentQueue.getJob(jobId);
    if (!job) return false;

    const jobState = await job.getState();
    return ['waiting', 'delayed', 'prioritized', 'active'].includes(jobState);
  } catch (error) {
    addLog.error('Failed to check evaluation experiment job status', { experimentId, error });
    return false;
  }
};

export const removeEvaluationExperimentJob = async (experimentId: string): Promise<boolean> => {
  const formatExperimentId = String(experimentId);
  try {
    const jobId = await evaluationExperimentQueue.getDeduplicationJobId(formatExperimentId);
    if (!jobId) {
      addLog.warn('No experiment job found to remove', { experimentId });
      return false;
    }

    const job = await evaluationExperimentQueue.getJob(jobId);
    if (!job) {
      addLog.warn('Experiment job not found in queue', { experimentId, jobId });
      return false;
    }

    const jobState = await job.getState();

    if (['waiting', 'delayed', 'prioritized'].includes(jobState)) {
      await job.remove();
      addLog.info('Evaluation experiment job removed successfully', { experimentId, jobId, jobState });
      return true;
    } else {
      addLog.warn('Cannot remove active or completed experiment job', { experimentId, jobId, jobState });
      return false;
    }
  } catch (error) {
    addLog.error('Failed to remove evaluation experiment job', { experimentId, error });
    return false;
  }
};
