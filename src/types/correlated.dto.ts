import { z } from 'zod';

export interface CorrelatedDTO {
  correlation_id: string;
}

export interface CorrelatedRequestDTO<T = object> extends CorrelatedDTO {
  request_id?: string;
  data: T;
}

export interface CorrelatedResponseDTO<T = object> extends CorrelatedDTO {
  request_id?: string;
  data: T;
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

  data: z.object({}).refine(val => val !== undefined, {
    message: "data is required",
  }),
});
