import { InternalServerError } from 'rest-pkg';

import { TransportAdapterName } from '../types/transport';

abstract class TransportAwareService {
  public defaultTransport: TransportAdapterName | null = null;
  public currentTransport: TransportAdapterName | null = null;

  constructor() {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);

        if (
          typeof value === "function" &&
          prop !== "usingTransport" &&
          prop !== "setDefaultTransport"
        ) {
          return async (...methodArgs: any[]) => {
            try {
              return await value.apply(target, methodArgs);
            } finally {
              target.currentTransport = null;
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
    const transportName: TransportAdapterName | null =
      this.currentTransport ?? this.defaultTransport;
    if (!transportName) {
      throw new InternalServerError("There is no active transport registered");
    }
    return transportName;
  }
}

export default TransportAwareService;
