import { TransportAdapterName, TransportAdapter } from './types/transport';

export default class Transport {
  private adapters: Record<string, TransportAdapter> = {};

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
