export type CircuitBreakerOptions = {
  timeout: number; // ms before request times out
  errorThresholdPercentage: number; // % failures before trip
  retryTimeout: number; // ms before half-open
};
