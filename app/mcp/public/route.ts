import { handlePublicMcpRequest } from "@/src/mcp/public/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handlePublicMcpRequest(request);
}

export async function GET(request: Request): Promise<Response> {
  return handlePublicMcpRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handlePublicMcpRequest(request);
}
