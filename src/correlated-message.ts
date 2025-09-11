import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, BaseError } from 'rest-pkg';

export class ErroMessageData {
  public code: number = 0;
  public message: string = '';

  constructor(init?: Partial<ErroMessageData>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}

export class CorrelatedMessage<T = object> {
  public id: string = '';
  public correlation_id: string = '';
  public action: string = '';
  public data: T = {} as T;
  public transport: string = '';

  isError(): this is CorrelatedMessage<ErroMessageData> {
    return this.data instanceof ErroMessageData;
  }

  static create<T extends object = object>(
    correlation_id: string,
    action: string,
    transport: string,
    data?: T,
    error?: unknown | null
  ): CorrelatedMessage<T | ErroMessageData> {
    const msg = new CorrelatedMessage<T | ErroMessageData>();
    msg.id = uuidv4();
    msg.correlation_id = correlation_id;
    msg.action = action;
    msg.transport = transport;

    if (error) {
      let code = 500;
      let errorMessage = 'Internal Server Error';

      if (error instanceof ZodError) {
        code = 400;
        errorMessage = error.errors.map(e => e.message).join(', ');
      } else if (error instanceof BaseError) {
        code = error.code;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      msg.data = new ErroMessageData({ code, message: errorMessage });
    } else {
      msg.data = data ?? {} as T;
    }

    return msg;
  }

  static parse<T extends object = object>(json: string): CorrelatedMessage<T> {
    let obj: unknown;
    try {
      obj = JSON.parse(json);
    } catch {
      throw new BadRequestError('Invalid JSON');
    }
    return this.fromObject<T>(obj);
  }

  static fromObject<T extends object = object>(obj: unknown): CorrelatedMessage<T> {
    if (
      !obj ||
      typeof obj !== 'object' ||
      typeof (obj as any).id !== 'string' ||
      typeof (obj as any).correlation_id !== 'string' ||
      typeof (obj as any).action !== 'string' ||
      typeof (obj as any).transport !== 'string' ||
      typeof (obj as any).data !== 'object'
    ) {
      throw new BadRequestError('Invalid CorrelatedMessage structure');
    }

    const raw = obj as any;
    const message = new CorrelatedMessage<T>();

    message.id = raw.id;
    message.correlation_id = raw.correlation_id;
    message.action = raw.action;
    message.transport = raw.transport;

    if ('code' in raw.data && 'message' in raw.data) {
      message.data = new ErroMessageData(raw.data) as unknown as T;
    } else {
      message.data = raw.data;
    }

    return message;
  }
}
