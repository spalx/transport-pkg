import { RequestTimeoutError } from 'rest-pkg';

import { CorrelatedMessage, ErroMessageData } from './correlated-message';

type PendingCallback = {
  callback: (req: CorrelatedMessage) => Promise<void>;
  timeoutHandle: NodeJS.Timeout;
};

class BroadcastWaiter {
  private pending = new Map<string, PendingCallback>();

  async waitForBroadcast(
    action: string,
    correlationId: string,
    timeout: number,
    callback: (req: CorrelatedMessage) => Promise<void>
  ): Promise<void> {
    const key = this.buildKey(action, correlationId);

    // If already registered, remove old one
    if (this.pending.has(key)) {
      const old = this.pending.get(key)!;
      clearTimeout(old.timeoutHandle);
      this.pending.delete(key);
    }

    const timeoutHandle = setTimeout(async () => {
      // On timeout, send an error CorrelatedMessage
      const errorMsg = CorrelatedMessage.create(
        correlationId,
        action,
        '',
        undefined,
        new RequestTimeoutError(`Timeout waiting for broadcast '${action}' (${correlationId})`)
      );
      try {
        await callback(errorMsg);
      } finally {
        this.pending.delete(key);
      }
    }, timeout * 1000);

    this.pending.set(key, { callback, timeoutHandle });
  }

  async resolve(req: CorrelatedMessage): Promise<void> {
    const key = this.buildKey(req.action, req.correlation_id);
    const pending = this.pending.get(key);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutHandle);
    this.pending.delete(key);

    try {
      await pending.callback(req);
    } catch (err) {
      // prevent unhandled errors from breaking the loop
    }
  }

  private buildKey(action: string, correlationId: string): string {
    return `${action}::${correlationId}`;
  }
}

export default new BroadcastWaiter();
