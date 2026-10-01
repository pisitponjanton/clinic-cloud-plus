import { handleStaffMcpRequest } from "@/src/mcp/staff/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleStaffMcpRequest(request);
}

export async function GET(request: Request): Promise<Response> {
  return handleStaffMcpRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleStaffMcpRequest(request);
}
