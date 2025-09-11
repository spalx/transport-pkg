import { BadRequestError } from 'rest-pkg';

import { TransportAdapterName } from '../types/transport';

abstract class TransportAwareService {
  public currentTransport: TransportAdapterName | null = null;
  public activeTransportOptions: Record<string, unknown> = {};

  useTransport(transport: TransportAdapterName, options: Record<string, unknown> = {}): void {
    this.currentTransport = transport;
    this.activeTransportOptions = options;
  }

  getActiveTransport(): TransportAdapterName {
    const transportName: TransportAdapterName | null = this.currentTransport;
    if (!transportName) {
      throw new BadRequestError('There is no active transport. Set transport via useTransport() method.');
    }
    return transportName;
  }

  getActiveTransportOptions(): Record<string, unknown> {
    return this.activeTransportOptions;
  }
}

export default TransportAwareService;
