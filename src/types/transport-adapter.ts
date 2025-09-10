import { InternalServerError } from 'rest-pkg';

import { CorrelatedRequestDTO, CorrelatedResponseDTO } from './correlated.dto';

abstract class TransportAdapter {
  async send(data: CorrelatedRequestDTO, options: Record<string, unknown>, timeout?: number): Promise<CorrelatedResponseDTO> {
    throw new InternalServerError('Transport does not support "send" method');
  }

  async broadcast(data: CorrelatedRequestDTO): Promise<void> {
    throw new InternalServerError('Transport does not support "broadcast" method');
  }
}

export default TransportAdapter;
