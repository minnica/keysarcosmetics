import { http, HttpResponse, delay } from "msw";
import { setupWorker } from "msw/browser";
import { handleDesignRequest } from "./api";
import { designOrigin, designStore, type DesignRow } from "./store";

const handlers = [
  http.all(`${designOrigin}/api/*`, async ({ request }) => {
    let body: DesignRow = {};
    if (!["GET", "HEAD"].includes(request.method)) {
      if (
        request.headers.get("content-type")?.includes("multipart/form-data")
      ) {
        const form = await request.formData();
        for (const [key, value] of form.entries()) {
          if (typeof value === "string") body[key] = value;
          else {
            body.fileName = value.name;
            body.sizeBytes = value.size;
          }
        }
      } else {
        body = (await request.json().catch(() => ({}))) as DesignRow;
      }
    }
    await delay(designStore.state.controls.scenario === "slow" ? 1500 : 80);
    const reply = handleDesignRequest(designStore.state, {
      method: request.method,
      url: new URL(request.url),
      body,
      headers: request.headers,
    });
    return HttpResponse.json(reply.body, { status: reply.status });
  }),
];

export const worker = setupWorker(...handlers);
let startup: ReturnType<typeof worker.start> | undefined;
export async function startDesignWorker() {
  return (startup ??= worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      if (url.origin === designOrigin || url.pathname.startsWith("/api/"))
        print.error();
    },
  }));
}
