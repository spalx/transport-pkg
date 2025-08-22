import { IAppPkg } from 'app-life-cycle-pkg';

import { CorrelatedRequestDTO, CorrelatedResponseDTO } from './correlated.dto';

export enum TransportAdapterName {
  Kafka = 'Kafka',
  HTTP = 'HTTP',
}

export interface TransportAdapter extends IAppPkg {
  send(data: CorrelatedRequestDTO, options: Record<string, unknown>, timeout?: number): Promise<CorrelatedResponseDTO>;
  sendResponse(data: CorrelatedResponseDTO): Promise<void>;
}
