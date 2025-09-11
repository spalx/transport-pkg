import { IAppPkg, AppRunPriority, appService } from 'app-life-cycle-pkg';
import { BadRequestError, throwErrorForStatus } from 'rest-pkg';

import { TransportAdapterName } from '../types/transport';
import TransportAdapter from '../transport-adapter';
import { CorrelatedMessage, ErroMessageData } from '../correlated-message';

class TransportService implements IAppPkg {
  private transports: Record<TransportAdapterName, TransportAdapter & IAppPkg> = {} as Record<TransportAdapterName, TransportAdapter & IAppPkg>;
  private broadcastableActions: string[] = [];
  private subscribedBroadcastableActions: Record<string, (req: CorrelatedMessage) => Promise<void>> = {};
  private actionHandlers: Record<string, (req: CorrelatedMessage) => Promise<object>> = {};

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

  subscribeToBroadcastableAction(action: string, callback: (req: CorrelatedMessage) => Promise<void>): void {
    this.subscribedBroadcastableActions[action] = callback;
  }

  getSubscribedBroadcastableActions(): Record<string, (req: CorrelatedMessage) => Promise<void>> {
    return this.subscribedBroadcastableActions;
  }

  setActionHandler(action: string, handler: (req: CorrelatedMessage) => Promise<object>): void {
    this.actionHandlers[action] = handler;
  }

  getActionHandlers(): Record<string, (req: CorrelatedMessage) => Promise<object>> {
    return this.actionHandlers;
  }

  async send(req: CorrelatedMessage, options: Record<string, unknown>, timeout?: number): Promise<CorrelatedMessage> {
    const transport: TransportAdapter & IAppPkg = this.getTransportByName(req.transport);
    const response: CorrelatedMessage = await transport.send(req, options, timeout);

    if (response.isError()) {
      const error: ErroMessageData = response.data;
      throwErrorForStatus(error.code, error.message);
    }

    return response;
  }

  async broadcast(req: CorrelatedMessage): Promise<void> {
    if (!this.broadcastableActions.includes(req.action)) {
      throw new BadRequestError(`Invalid action provided: ${req.action}`);
    }

    const transport: TransportAdapter & IAppPkg = this.getTransportByName(req.transport);
    await transport.broadcast(req);
  }

  private getTransportByName(transportName: string): TransportAdapter & IAppPkg {
    if (!transportName || !(transportName in TransportAdapterName)) {
      throw new BadRequestError(`Invalid transport name`);
    }
    const transport: TransportAdapter & IAppPkg | undefined = this.transports[transportName as TransportAdapterName];
    if (!transport) {
      throw new BadRequestError(`${transportName} transport not registered`);
    }

    return transport;
  }
}

export default new TransportService();
