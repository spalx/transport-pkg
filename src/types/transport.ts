export enum TransportAdapterName {
  Kafka = 'Kafka',
  HTTP = 'HTTP',
}

export interface TransportData {
  adapter_name: TransportAdapterName;
  host: string;
  port: number;
}
