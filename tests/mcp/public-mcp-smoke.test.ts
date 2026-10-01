import { describe, expect, it } from "vitest";

import { handlePublicMcpRequest } from "@/src/mcp/public/http";
import {
  PUBLIC_MCP_TOOL_NAMES,
  publicMcpHandler,
} from "@/src/mcp/public/server";
import {
  getPublicClinicInfo,
  getPublicDoctors,
  getPublicOpeningHours,
  getPublicPromotions,
  getPublicServiceDetail,
  getPublicServices,
  searchPublicServices,
} from "@/src/mcp/public/tools";

function rpcRequest(body: unknown): Request {
  return new Request("http://localhost/mcp/public", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

async function rpc(body: unknown): Promise<Record<string, unknown>> {
  const response = await publicMcpHandler.fetch(rpcRequest(body));
  expect(response.status).toBe(200);

  const text = await response.text();

  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const dataLine = text
      .split("\n")
      .find((line) => line.startsWith("data:"));

    if (!dataLine) {
      throw new Error("Missing SSE data line");
    }

    return JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
  }

  return JSON.parse(text) as Record<string, unknown>;
}

describe("Public MCP phase 28 smoke", () => {
  it("public tool functions use the stable Base JSON envelope", () => {
    expect(getPublicClinicInfo()).toMatchObject({
      ok: true,
      source: "base-json",
      data: {
        id: "CLINIC-001",
      },
    });

    expect(getPublicOpeningHours("MONDAY")).toMatchObject({
      ok: true,
      source: "base-json",
      data: {
        requestedDay: "MONDAY",
        hours: [{ day: "MONDAY", open: "09:00", close: "18:00" }],
      },
    });

    expect(getPublicServices().data).toHaveLength(8);
    expect(searchPublicServices("ตรวจทั่วไป").data[0]?.id).toBe("SVC-001");
    expect(getPublicServiceDetail("SVC-001")).toMatchObject({
      ok: true,
      data: { price: 500 },
    });
    expect(getPublicServiceDetail("SVC-999")).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Record not found in the mock dataset.",
      },
    });
    expect(getPublicDoctors().data).toHaveLength(4);
    expect(getPublicPromotions("2026-10-01").data.promotions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "PROMO-001", status: "ACTIVE" }),
        expect.objectContaining({ id: "PROMO-002", status: "ACTIVE" }),
        expect.objectContaining({ id: "PROMO-003", status: "INACTIVE" }),
      ]),
    );
  });

  it("serves the public MCP route without an auth header", async () => {
    const response = await handlePublicMcpRequest(
      rpcRequest({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/list",
      }),
    );

    expect(response.status).toBe(200);
  });

  it("exposes exactly the seven required Public MCP tools", async () => {
    const response = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    const result = response.result as {
      tools?: Array<{ name: string }>;
    };

    expect(result.tools?.map((tool) => tool.name).sort()).toEqual(
      [...PUBLIC_MCP_TOOL_NAMES].sort(),
    );
  });

  it("calls a public tool and returns structured Base JSON content", async () => {
    const response = await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_service_detail",
        arguments: {
          serviceId: "SVC-001",
        },
      },
    });

    const result = response.result as {
      structuredContent?: {
        ok?: boolean;
        source?: string;
        data?: { id?: string; price?: number };
      };
    };

    expect(result.structuredContent).toMatchObject({
      ok: true,
      source: "base-json",
      data: {
        id: "SVC-001",
        price: 500,
      },
    });
  });
});
