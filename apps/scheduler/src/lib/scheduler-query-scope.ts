export function serializeSchedulerQueryPart(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

export function buildSchedulerQueryScope({
  sessionKey,
  branchId,
  queryKey,
  dependencies,
}: {
  sessionKey: string;
  branchId?: string;
  queryKey: string;
  dependencies: readonly unknown[];
}): string {
  return [
    sessionKey,
    branchId ?? "*",
    queryKey,
    ...dependencies.map(serializeSchedulerQueryPart),
  ].join("\u001f");
}

export function shouldAcceptSchedulerResponse({
  request,
  currentRequest,
  requestScope,
  currentScope,
}: {
  request: number;
  currentRequest: number;
  requestScope: string;
  currentScope: string;
}): boolean {
  return request === currentRequest && requestScope === currentScope;
}

export function schedulerQueryMatchesInvalidation(
  queryKey: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((prefix) => queryKey.startsWith(prefix));
}
