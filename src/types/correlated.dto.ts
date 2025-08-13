import { z } from 'zod';

import { TransportAdapterName } from './transport';

export interface CorrelatedDTO {
  correlation_id: string;
}

export interface CorrelatedRequestDTO<T = object> extends CorrelatedDTO {
  request_id?: string;
  action: string;
  data: T;
  transport_name?: TransportAdapterName;
}

export interface CorrelatedResponseDTO<T = object> extends CorrelatedRequestDTO {
  status: number;
  error?: string;
}

export const CorrelatedRequestDTOSchema = z.object({
  correlation_id: z.string({
    required_error: "correlation_id is required",
    invalid_type_error: "correlation_id must be a string"
  }).min(1, "correlation_id cannot be empty"),

  request_id: z.string({
    invalid_type_error: "request_id must be a string"
  })
  .optional()
  .refine(val => val === undefined || val.trim() !== '', {
    message: "request_id cannot be empty",
  }),

  action: z.string({
    required_error: "action is required",
    invalid_type_error: "action must be a string"
  }).min(1, "action cannot be empty"),

  data: z.object({}).refine(val => val !== undefined, {
    message: "data is required",
  }),
});
