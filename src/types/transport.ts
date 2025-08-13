import { IAppPkg } from 'app-life-cycle-pkg';
import { InternalServerError } from 'rest-pkg';

import { CorrelatedRequestDTO, CorrelatedResponseDTO } from './correlated.dto';

export enum TransportAdapterName {
  Kafka = 'Kafka',
  HTTP = 'HTTP',
}

export interface TransportAdapter extends IAppPkg {
  send(data: CorrelatedRequestDTO, timeout?: number): Promise<CorrelatedResponseDTO>;
  sendResponse(data: CorrelatedResponseDTO): Promise<void>;
}

export function WithTransport<TBase extends new (...args: any[]) => {}>(Base: TBase) {
  return class extends Base {
    public defaultTransport: TransportAdapterName | null = null;
    public currentTransport: TransportAdapterName | null = null;

    constructor(...args: any[]) {
      super(...args);

      return new Proxy(this, {
        get: (target, prop, receiver) => {
          const value = Reflect.get(target, prop, receiver);

          // Wrap all methods except config methods
          if (typeof value === "function" && prop !== "usingTransport" && prop !== "setDefaultTransport") {
            return async (...methodArgs: any[]) => {
              try {
                return await value.apply(target, methodArgs);
              } finally {
                target.currentTransport = null; // auto reset temp transport
              }
            };
          }
          return value;
        },
      });
    }

    setDefaultTransport(transport: TransportAdapterName): void {
      this.defaultTransport = transport;
    }

    usingTransport(transport: TransportAdapterName): this {
      this.currentTransport = transport;
      return this;
    }

    getActiveTransport(): TransportAdapterName {
      const transportName: TransportAdapterName | null = this.currentTransport ?? this.defaultTransport;
      if (!transportName) {
        throw new InternalServerError('There is no active transport registered');
      }

      return transportName;
    }
  };
}
