import type {
  EvaluationDataset as IEvaluationDataset,
  EvaluationData
} from '@fastgpt/global/core/evaluation/type';
import {
  generateId,
  validateEvaluationData,
  validateEvaluationDataset
} from '@fastgpt/global/core/evaluation/utils';

export class EvaluationDataset implements IEvaluationDataset {
  public readonly id: string;
  public name: string;
  public description?: string;
  public version: string;
  public data: EvaluationData[];
  public readonly created_at: Date;
  public updated_at: Date;
  public tags?: string[];
  public source_type: 'manual' | 'jsonl' | 'excel' | 'huggingface' | 'generated';
  public source_config?: Record<string, any>;
  public teamId: string;
  public tmbId: string;

  constructor(
    props: Omit<IEvaluationDataset, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) {
    this.id = props.id || generateId();
    this.name = props.name;
    this.description = props.description;
    this.version = props.version;
    this.data = props.data;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.tags = props.tags;
    this.source_type = props.source_type;
    this.source_config = props.source_config;
    this.teamId = props.teamId;
    this.tmbId = props.tmbId;

    this.validateData();
  }

  private validateData(): void {
    validateEvaluationDataset(this);
  }

  public addData(data: EvaluationData[]): void {
    data.forEach((item) => validateEvaluationData(item));
    this.data.push(...data);
    this.updated_at = new Date();
  }

  public removeData(dataIds: string[]): void {
    this.data = this.data.filter((item) => !dataIds.includes(item.id));
    this.updated_at = new Date();
  }

  public updateData(dataId: string, updates: Partial<EvaluationData>): void {
    const index = this.data.findIndex((item) => item.id === dataId);
    if (index === -1) {
      throw new Error(`Data with id ${dataId} not found`);
    }

    const updatedItem = { ...this.data[index], ...updates };
    validateEvaluationData(updatedItem);

    this.data[index] = updatedItem;
    this.updated_at = new Date();
  }

  public filterData(filters: {
    scenario?: string;
    persona?: string;
    tags?: string[];
  }): EvaluationData[] {
    return this.data.filter((item) => {
      if (filters.scenario && item.scenario !== filters.scenario) {
        return false;
      }
      if (filters.persona && item.persona !== filters.persona) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const itemTags = Object.keys(item.metadata || {});
        if (!filters.tags.some((tag) => itemTags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }

  public getStatistics() {
    const scenarios = new Set(this.data.map((d) => d.scenario).filter(Boolean));
    const personas = new Set(this.data.map((d) => d.persona).filter(Boolean));

    return {
      total_count: this.data.length,
      scenarios: Array.from(scenarios),
      personas: Array.from(personas),
      has_context: this.data.filter((d) => d.context).length,
      has_retrieval_context: this.data.filter((d) => d.retrieval_context).length
    };
  }

  public clone(newVersion: string): EvaluationDataset {
    return new EvaluationDataset({
      name: this.name,
      description: this.description,
      version: newVersion,
      data: [...this.data],
      tags: [...(this.tags || [])],
      source_type: this.source_type,
      source_config: { ...this.source_config },
      teamId: this.teamId,
      tmbId: this.tmbId
    });
  }
}
