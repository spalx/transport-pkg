import { InternalServerError } from 'rest-pkg';

import { CircuitBreakerOptions } from './types/circuit-breaker';

enum CircuitState {
  Closed = 'Closed',
  Open = 'Open',
  HalfOpen = 'HalfOpen',
}

export default class CircuitBreaker<TArgs extends any[], TResult> {
  private state: CircuitState = CircuitState.Closed;
  private failures = 0;
  private successes = 0;
  private lastOpened = 0;
  private action: (...args: TArgs) => Promise<TResult>;
  private options: CircuitBreakerOptions;

  constructor(action: (...args: TArgs) => Promise<TResult>, options: CircuitBreakerOptions) {
    this.action = action;
    this.options = options;
  }

  async exec(...args: TArgs): Promise<TResult> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - this.lastOpened > this.options.retryTimeout) {
        this.transitionTo(CircuitState.HalfOpen);
      } else {
        throw new InternalServerError('CircuitBreaker: open');
      }
    }

    try {
      const result = await this.callWithTimeout(args);

      if (this.state === CircuitState.HalfOpen) {
        this.transitionTo(CircuitState.Closed);
      }

      this.successes++;

      return result;
    } catch (err) {
      this.failures++;
      if (this.state === CircuitState.HalfOpen || this.getFailureRate() >= this.options.errorThresholdPercentage) {
        this.transitionTo(CircuitState.Open);
      }

      throw err;
    }
  }

  private getFailureRate() {
    const total = this.failures + this.successes;
    if (total === 0) {
      return 0;
    }

    return (this.failures / total) * 100;
  }

  private transitionTo(state: CircuitState) {
    this.state = state;

    if (state === CircuitState.Open) {
      this.lastOpened = Date.now();
    }

    if (state === CircuitState.Closed) {
      this.failures = 0;
      this.successes = 0;
    }
  }

  private async callWithTimeout(args: TArgs): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), this.options.timeout);

      this.action(...args).then((res) => {
        clearTimeout(timer);
        resolve(res);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
