import { requireStaffMcpSecret } from "@/src/mcp/staff/config";
import {
  handleStaffAuthorizationGet,
  handleStaffAuthorizationPost,
} from "@/src/mcp/staff/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleStaffAuthorizationGet(request, requireStaffMcpSecret());
}

export async function POST(request: Request): Promise<Response> {
  return handleStaffAuthorizationPost(request, requireStaffMcpSecret());
}
