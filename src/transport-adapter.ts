import { InternalServerError } from 'rest-pkg';

import { CorrelatedMessage } from './correlated-message';

abstract class TransportAdapter {
  async send(req: CorrelatedMessage, options: Record<string, unknown>): Promise<CorrelatedMessage> {
    throw new InternalServerError('Transport does not support "send" method');
  }

  async broadcast(req: CorrelatedMessage): Promise<void> {
    throw new InternalServerError('Transport does not support "broadcast" method');
  }
}

export default TransportAdapter;
