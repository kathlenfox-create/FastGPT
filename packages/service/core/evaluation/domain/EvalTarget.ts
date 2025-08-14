import type {
  EvalTarget as IEvalTarget,
  EvalTargetConfig,
  MockConfig,
  HttpConfig,
  FunctionConfig,
  AppConfig
} from '@fastgpt/global/core/evaluation/type';
import { generateId } from '@fastgpt/global/core/evaluation/utils';

export class EvalTarget implements IEvalTarget {
  public readonly id: string;
  public name: string;
  public description?: string;
  public config: EvalTargetConfig;
  public readonly created_at: Date;
  public updated_at: Date;
  public teamId: string;
  public tmbId: string;

  constructor(props: Omit<IEvalTarget, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
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
      throw new Error('Target name is required');
    }

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config?.type) {
      throw new Error('Target config type is required');
    }

    if (!this.config?.config) {
      throw new Error('Target config is required');
    }

    switch (this.config.type) {
      case 'mock':
        this.validateMockConfig(this.config.config as MockConfig);
        break;
      case 'http':
        this.validateHttpConfig(this.config.config as HttpConfig);
        break;
      case 'function':
        this.validateFunctionConfig(this.config.config as FunctionConfig);
        break;
      case 'app':
        this.validateAppConfig(this.config.config as AppConfig);
        break;
      default:
        throw new Error(`Unsupported target type: ${this.config.type}`);
    }
  }

  private validateMockConfig(config: MockConfig): void {
    if (!Array.isArray(config.responses)) {
      throw new Error('Mock config responses must be an array');
    }
  }

  private validateHttpConfig(config: HttpConfig): void {
    if (!config.url?.trim()) {
      throw new Error('HTTP config URL is required');
    }

    if (!config.method) {
      throw new Error('HTTP config method is required');
    }
  }

  private validateFunctionConfig(config: FunctionConfig): void {
    if (!config.module_path?.trim()) {
      throw new Error('Function config module_path is required');
    }

    if (!config.function_name?.trim()) {
      throw new Error('Function config function_name is required');
    }
  }

  private validateAppConfig(config: AppConfig): void {
    if (!config.appId?.trim()) {
      throw new Error('App config appId is required');
    }
  }

  public async invoke(input: string, context?: Record<string, any>): Promise<string> {
    switch (this.config.type) {
      case 'mock':
        return this.invokeMock(input);
      case 'http':
        return this.invokeHttp(input, context);
      case 'function':
        return this.invokeFunction(input, context);
      case 'app':
        return this.invokeApp(input, context);
      default:
        throw new Error(`Unsupported target type: ${this.config.type}`);
    }
  }

  private invokeMock(input: string): Promise<string> {
    const mockConfig = this.config.config as MockConfig;

    for (const response of mockConfig.responses) {
      if (!response.input_pattern || new RegExp(response.input_pattern).test(input)) {
        const delay = response.delay || 0;
        return new Promise((resolve) => {
          setTimeout(() => resolve(response.output), delay);
        });
      }
    }

    return Promise.resolve('Default mock response');
  }

  private async invokeHttp(input: string, context?: Record<string, any>): Promise<string> {
    const httpConfig = this.config.config as HttpConfig;

    const requestOptions: RequestInit = {
      method: httpConfig.method,
      headers: {
        'Content-Type': 'application/json',
        ...httpConfig.headers
      }
    };

    if (httpConfig.method !== 'GET') {
      requestOptions.body = JSON.stringify({ input, context });
    }

    const controller = new AbortController();
    const timeout = httpConfig.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(httpConfig.url, {
        ...requestOptions,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.output || result.data || String(result);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async invokeFunction(input: string, context?: Record<string, any>): Promise<string> {
    const funcConfig = this.config.config as FunctionConfig;

    try {
      // For demo purposes, we'll simulate function execution
      // In production, implement proper sandboxing and security measures
      if (funcConfig.module_path.includes('demo') || funcConfig.module_path.includes('test')) {
        // Simulate a demo function response
        return `Demo function response for input: ${input}`;
      }

      // In a real implementation, you would:
      // 1. Validate the module_path against an allowlist
      // 2. Use a secure sandbox environment
      // 3. Implement proper error handling and timeouts

      // For now, return a placeholder response to avoid dynamic import warnings
      throw new Error(
        `Function targets require custom implementation. Module: ${funcConfig.module_path}, Function: ${funcConfig.function_name}`
      );
    } catch (error) {
      throw new Error(
        `Function execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async invokeApp(input: string, context?: Record<string, any>): Promise<string> {
    const appConfig = this.config.config as AppConfig;

    try {
      // 这里需要调用FastGPT的应用API
      // 暂时返回模拟响应
      return `App response for input: ${input} (App ID: ${appConfig.appId})`;
    } catch (error) {
      throw new Error(
        `App execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  public updateConfig(config: EvalTargetConfig): void {
    this.config = config;
    this.validateConfig();
    this.updated_at = new Date();
  }

  public async testConnection(): Promise<{
    success: boolean;
    error?: string;
    latency_ms?: number;
  }> {
    const startTime = Date.now();

    try {
      await this.invoke('test input', { test: true });
      return {
        success: true,
        latency_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency_ms: Date.now() - startTime
      };
    }
  }
}
