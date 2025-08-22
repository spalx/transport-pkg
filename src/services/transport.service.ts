import { ZodError } from 'zod';
import { IAppPkg, AppRunPriority, appService } from 'app-life-cycle-pkg';
import { InternalServerError, BaseError } from 'rest-pkg';

import { TransportAdapterName, TransportAdapter } from '../types/transport';
import { CorrelatedRequestDTO, CorrelatedResponseDTO } from '../types/correlated.dto';

class TransportService implements IAppPkg {
  private transports: Record<TransportAdapterName, TransportAdapter> = {} as Record<TransportAdapterName, TransportAdapter>;
  private sendableActions: string[] = [];
  private receivableActions: Record<string, (data: CorrelatedRequestDTO) => Promise<void>> = {};

  async init(): Promise<void> {
    for (const transportName in this.transports) {
      const adapter: TransportAdapter = this.transports[transportName as TransportAdapterName];
      await adapter.init?.();
    }
  }

  async shutdown(): Promise<void> {
    for (const transportName in this.transports) {
      const adapter: TransportAdapter = this.transports[transportName as TransportAdapterName];
      await adapter.shutdown?.();
    }
  }

  used(): void {
    const keys: TransportAdapterName[] = Object.keys(this.transports) as TransportAdapterName[];
    for (const transportName of keys) {
      appService.use(this.transports[transportName]); // Chain transports to the app life cycle
    }
  }

  getPriority(): number {
    return AppRunPriority.Lowest;
  }

  registerTransport(transportName: TransportAdapterName, transport: TransportAdapter): void {
    this.transports[transportName] = transport;
  }

  transportsSend(sendableActions: string[]): void {
    this.sendableActions.push(...sendableActions);
  }

  getSendableActions(): string[] {
    return this.sendableActions;
  }

  transportsReceive(action: string, callback: (data: CorrelatedRequestDTO) => Promise<void>): void {
    this.receivableActions[action] = callback;
  }

  getReceivableActions(): Record<string, (data: CorrelatedRequestDTO) => Promise<void>> {
    return this.receivableActions;
  }

  async send(data: CorrelatedRequestDTO, options: Record<string, unknown>, timeout?: number): Promise<CorrelatedResponseDTO> {
    const transport: TransportAdapter = this.getTransportByName(data.transport_name);
    return transport.send(data, options, timeout);
  }

  async sendResponse(data: CorrelatedRequestDTO, error: unknown | null): Promise<void> {
    const transport: TransportAdapter = this.getTransportByName(data.transport_name);

    let errorMessage = '';
    let status = 0;
    if (error !== null) {
      status = 500;
      errorMessage = 'Internal Server Error';

      if (error instanceof ZodError) {
        status = 400;
        errorMessage = error.errors.map(e => e.message).join(', ');
      } else if (error instanceof BaseError) {
        status = error.code;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
    }

    const response: CorrelatedResponseDTO = {
      correlation_id: data.correlation_id,
      request_id: data.request_id,
      action: data.action,
      data: data.data,
      status,
      error: errorMessage
    };

    transport.sendResponse(response);
  }

  private getTransportByName(transportName: TransportAdapterName | undefined): TransportAdapter {
    if (!transportName) {
      throw new InternalServerError(`Invalid transport name`);
    }
    const transport: TransportAdapter | undefined = this.transports[transportName];
    if (!transport) {
      throw new InternalServerError(`${transportName} transport not registered`);
    }

    return transport;
  }
}

export default new TransportService();
