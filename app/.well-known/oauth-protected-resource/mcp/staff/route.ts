import { buildStaffProtectedResourceMetadata } from "@/src/mcp/staff/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  return Response.json(buildStaffProtectedResourceMetadata(origin), {
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
