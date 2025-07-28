import { IAppPkg } from 'app-life-cycle-pkg';

import { TransportAdapterName, TransportAdapter } from '../types/transport';

class TransportService implements IAppPkg {
  private adapters: Record<string, TransportAdapter> = {};

  async init(): Promise<void> {
    for (const transportName in this.adapters) {
      const adapter: TransportAdapter = this.adapters[transportName];
      await adapter.init?.();
    }
  }

  async shutdown(): Promise<void> {
    for (const transportName in this.adapters) {
      const adapter: TransportAdapter = this.adapters[transportName];
      await adapter.shutdown?.();
    }
  }

  register(transportName: TransportAdapterName, adapter: TransportAdapter): void {
    this.adapters[transportName] = adapter;
  }

  using(transportName: TransportAdapterName): TransportAdapter {
    if (!this.adapters[transportName]) {
      throw new Error('Adapter not registered for transport: ' + transportName);
    }

    return this.adapters[transportName];
  }
}

export default new TransportService();
