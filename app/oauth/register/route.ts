import { requireStaffMcpSecret } from "@/src/mcp/staff/config";
import { handleStaffClientRegistration } from "@/src/mcp/staff/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleStaffClientRegistration(request, requireStaffMcpSecret());
}
