import { ZodError } from 'zod';
import { IAppPkg, AppRunPriority, appService } from 'app-life-cycle-pkg';
import { BadRequestError, InternalServerError, BaseError } from 'rest-pkg';

import { TransportAdapterName } from '../types/transport';
import TransportAdapter from '../types/transport-adapter';
import { CorrelatedRequestDTO, CorrelatedResponseDTO } from '../types/correlated.dto';

class TransportService implements IAppPkg {
  private transports: Record<TransportAdapterName, TransportAdapter & IAppPkg> = {} as Record<TransportAdapterName, TransportAdapter & IAppPkg>;
  private broadcastableActions: string[] = [];
  private subscribedBroadcastableActions: Record<string, (data: CorrelatedRequestDTO) => Promise<void>> = {};
  private actionHandlers: Record<string, (data: CorrelatedRequestDTO) => Promise<CorrelatedResponseDTO>> = {};

  async init(): Promise<void> {
    for (const transportName in this.transports) {
      const adapter: TransportAdapter & IAppPkg = this.transports[transportName as TransportAdapterName];
      await adapter.init?.();
    }
  }

  async shutdown(): Promise<void> {
    for (const transportName in this.transports) {
      const adapter: TransportAdapter & IAppPkg = this.transports[transportName as TransportAdapterName];
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

  registerTransport(transportName: TransportAdapterName, transport: TransportAdapter & IAppPkg): void {
    this.transports[transportName] = transport;
  }

  setActionsToBroadcast(broadcastableActions: string[]): void {
    this.broadcastableActions.push(...broadcastableActions);
  }

  getBroadcastableActions(): string[] {
    return this.broadcastableActions;
  }

  subscribeToBroadcastableAction(action: string, callback: (data: CorrelatedRequestDTO) => Promise<void>): void {
    this.subscribedBroadcastableActions[action] = callback;
  }

  getSubscribedBroadcastableActions(): Record<string, (data: CorrelatedRequestDTO) => Promise<void>> {
    return this.subscribedBroadcastableActions;
  }

  setActionHandler(action: string, handler: (data: CorrelatedRequestDTO) => Promise<CorrelatedResponseDTO>): void {
    this.actionHandlers[action] = handler;
  }

  getActionHandlers(): Record<string, (data: CorrelatedRequestDTO) => Promise<CorrelatedResponseDTO>> {
    return this.actionHandlers;
  }

  async send(data: CorrelatedRequestDTO, options: Record<string, unknown>, timeout?: number): Promise<CorrelatedResponseDTO> {
    const transport: TransportAdapter & IAppPkg = this.getTransportByName(data.transport_name);
    return transport.send(data, options, timeout);
  }

  async broadcast(data: CorrelatedRequestDTO): Promise<void> {
    if (!this.broadcastableActions.includes(data.action)) {
      throw new BadRequestError(`Invalid action provided: ${data.action}`);
    }

    const transport: TransportAdapter & IAppPkg = this.getTransportByName(data.transport_name);
    await transport.broadcast(data);
  }

  getResponseObject(data: CorrelatedRequestDTO, error: unknown | null): CorrelatedResponseDTO {
    const transport: TransportAdapter & IAppPkg = this.getTransportByName(data.transport_name);

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

    return response;
  }

  getResponseObjectForRequest(request: CorrelatedRequestDTO, responseData: object, error: unknown | null): CorrelatedResponseDTO {
    const { action, data, correlation_id, request_id, transport_name } = request;

    const responseRequest: CorrelatedRequestDTO = {
      correlation_id,
      request_id,
      action,
      transport_name,
      data: responseData,
    };

    return this.getResponseObject(responseRequest, error);
  }

  private getTransportByName(transportName: TransportAdapterName | undefined): TransportAdapter & IAppPkg {
    if (!transportName) {
      throw new InternalServerError(`Invalid transport name`);
    }
    const transport: TransportAdapter & IAppPkg | undefined = this.transports[transportName];
    if (!transport) {
      throw new InternalServerError(`${transportName} transport not registered`);
    }

    return transport;
  }
}

export default new TransportService();
