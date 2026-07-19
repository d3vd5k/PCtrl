import { createProxyMiddleware , responseInterceptor} from "http-proxy-middleware";
import { prisma } from "./prisma.js";

function extract_session_id(req: any): string | undefined {
  // Normal HTTP requests: Express may expose route params on the request object.
  const routeId = req.params?.session_id ?? req.params?.sessionId;
  if (routeId) return routeId;

  // For mounted Express middleware and raw WebSocket upgrades, extract from the URL.
  const url = req.originalUrl ?? req.url ?? "";
  return url.match(/\/(?:proxy\/)?session\/([^/?]+)/)?.[1];
}

export const code_server_proxy = createProxyMiddleware({
  ws: true,
  changeOrigin: true,
  selfHandleResponse: true,

  router: async (req) => {
    const sessionId = extract_session_id(req);
    if (!sessionId) throw new Error("Could not determine session ID from request.");

    const service = await prisma.session_service.findFirst({
      where: { session_id: sessionId, service_type: "CODE_SERVER", status: "RUNNING" },
      orderBy: { started_at: "desc" },
    });
    if (!service) throw new Error(`No running code-server found for session ${sessionId}`);
    return `http://${process.env.TARGET_PC_IP}:${service.port}`;
  },

  pathRewrite: (path, req) => {
    const sessionId = extract_session_id(req);
    const stripped = path.replace(`/proxy/session/${sessionId}`, "");
    return stripped === "" ? "/" : stripped;
  },

  on: {
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
      if (!responseBuffer) return responseBuffer;
      const sessionId = extract_session_id(req);
      if (!sessionId) return responseBuffer;

      const buffer = responseBuffer instanceof Buffer ? responseBuffer : Buffer.from(responseBuffer);
      // If you need body rewriting later, do it here and return the transformed Buffer/string.
      return buffer;
    }),
    error: (err, req, res) => {
      console.error("[code-server-proxy] error:", err);
      if (res && "writeHead" in res) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Could not reach code-server for this session." }));
      }
    },
  },
});