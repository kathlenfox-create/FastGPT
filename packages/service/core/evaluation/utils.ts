import { getEvaluationExperimentWorker } from './mq';
import { processEvaluationExperiment } from './worker';
import { addLog } from '../../common/system/log';

export const startEvaluationExperimentQueue = () => {
  try {
    const worker = getEvaluationExperimentWorker(processEvaluationExperiment);
    
    worker.on('completed', (job) => {
      addLog.info('Evaluation experiment job completed', { 
        experimentId: job.data.experimentId 
      });
    });
    
    worker.on('failed', (job, err) => {
      addLog.error('Evaluation experiment job failed', { 
        experimentId: job?.data.experimentId,
        error: err.message 
      });
    });
    
    addLog.info('Evaluation experiment queue worker started');
    return worker;
  } catch (error) {
    addLog.error('Failed to start evaluation experiment queue worker', { error });
    throw error;
  }
};
