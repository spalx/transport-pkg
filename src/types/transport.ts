import { CorrelatedRequestDTO, CorrelatedResponseDTO } from './correlated.dto';

export enum TransportAdapterName {
  Kafka = 'Kafka',
  HTTP = 'HTTP',
}

export interface TransportData {
  adapter_name: TransportAdapterName;
  host: string;
  port: number;
}

export interface TransportAdapter {
  send(data: CorrelatedRequestDTO): Promise<void>;
  sendResponse(data: CorrelatedResponseDTO): Promise<void>;
}
