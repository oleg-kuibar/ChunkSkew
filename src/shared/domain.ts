export interface IdempotentResponse<T> {
  deduped: boolean;
  result: T;
}
