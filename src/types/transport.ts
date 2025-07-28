import { IAppPkg } from 'app-life-cycle-pkg';

import { CorrelatedRequestDTO, CorrelatedResponseDTO } from './correlated.dto';

export enum TransportAdapterName {
  Kafka = 'Kafka',
  HTTP = 'HTTP',
}

export interface TransportAdapter extends IAppPkg {
  send(data: CorrelatedRequestDTO, timeout?: number): Promise<CorrelatedResponseDTO>;
  sendResponse(data: CorrelatedResponseDTO, error: unknown | null): Promise<void>;
}
