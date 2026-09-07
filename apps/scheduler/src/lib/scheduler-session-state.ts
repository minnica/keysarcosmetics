export const schedulerSessionRefreshIntervalMs = 30_000;

export function shouldAcceptSchedulerSessionResponse(input: {
  request: number;
  currentRequest: number;
  token: string;
  currentToken: string | null;
}): boolean {
  return (
    input.request === input.currentRequest && input.token === input.currentToken
  );
}
