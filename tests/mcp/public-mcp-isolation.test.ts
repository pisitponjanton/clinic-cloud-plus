import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import clinicJson from "@/src/data/public/clinic.json";
import doctorsJson from "@/src/data/public/doctors.json";
import promotionsJson from "@/src/data/public/promotions.json";
import servicesJson from "@/src/data/public/services.json";
import {
  PUBLIC_MCP_INSTRUCTIONS,
  PUBLIC_MCP_TOOL_NAMES,
  publicMcpHandler,
} from "@/src/mcp/public/server";
import type { Promotion, PublicDoctor, Service } from "@/src/types/public-data";

const clinic = clinicJson;
const doctors = doctorsJson as PublicDoctor[];
const promotions = promotionsJson as Promotion[];
const services = servicesJson as Service[];

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
  const text = await response.text();

  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const dataLine = text.split("\n").find((line) => line.startsWith("data:"));

    if (!dataLine) {
      throw new Error("Missing SSE data line");
    }

    return JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return rpc({
    jsonrpc: "2.0",
    id: 100,
    method: "tools/call",
    params: { name, arguments: args },
  });
}

function structured(response: Record<string, unknown>): Record<string, unknown> {
  const result = response.result as
    | { structuredContent?: Record<string, unknown> }
    | undefined;

  if (!result?.structuredContent) {
    throw new Error(`Missing structuredContent: ${JSON.stringify(response)}`);
  }

  return result.structuredContent;
}

function expectedPromotionStatus(
  promotion: Promotion,
  asOfDate: string,
): "ACTIVE" | "INACTIVE" | "UPCOMING" | "EXPIRED" {
  if (!promotion.active) return "INACTIVE";
  if (asOfDate < promotion.startDate) return "UPCOMING";
  if (asOfDate > promotion.endDate) return "EXPIRED";
  return "ACTIVE";
}

describe("Public MCP exact public-data grounding", () => {
  it("returns clinic info exactly from public clinic JSON", async () => {
    expect(structured(await callTool("get_clinic_info"))).toEqual({
      ok: true,
      source: "base-json",
      data: {
        id: clinic.id,
        name: clinic.name,
        description: clinic.description,
        phone: clinic.phone,
        address: clinic.address,
      },
    });
  });

  it("returns opening hours exactly from public clinic JSON", async () => {
    expect(structured(await callTool("get_opening_hours"))).toEqual({
      ok: true,
      source: "base-json",
      data: {
        requestedDay: null,
        hours: clinic.openingHours,
      },
    });

    expect(
      structured(await callTool("get_opening_hours", { day: "MONDAY" })),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: {
        requestedDay: "MONDAY",
        hours: clinic.openingHours.filter((entry) => entry.day === "MONDAY"),
      },
    });
  });

  it("returns services and prices exactly from public service JSON", async () => {
    expect(structured(await callTool("get_services"))).toEqual({
      ok: true,
      source: "base-json",
      data: services,
    });

    for (const service of services) {
      expect(
        structured(
          await callTool("get_service_detail", { serviceId: service.id }),
        ),
      ).toEqual({
        ok: true,
        source: "base-json",
        data: service,
      });
    }
  });

  it("returns promotion records unchanged plus derived status only", async () => {
    const content = structured(await callTool("get_promotions"));
    const data = content.data as {
      evaluatedOn: string;
      promotions: Array<Promotion & { status: string }>;
    };

    expect(content.ok).toBe(true);
    expect(content.source).toBe("base-json");
    expect(data.evaluatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.promotions).toEqual(
      promotions.map((promotion) => ({
        ...promotion,
        status: expectedPromotionStatus(promotion, data.evaluatedOn),
      })),
    );
  });

  it("returns only explicit public-safe doctor fields", async () => {
    const content = structured(await callTool("get_doctors_public"));

    expect(content).toEqual({
      ok: true,
      source: "base-json",
      data: doctors.map((doctor) => ({
        id: doctor.id,
        clinicId: doctor.clinicId,
        displayName: doctor.displayName,
        specialty: doctor.specialty,
        publicBio: doctor.publicBio,
        active: doctor.active,
      })),
    });

    for (const doctor of content.data as Array<Record<string, unknown>>) {
      expect(Object.keys(doctor).sort()).toEqual(
        ["id", "clinicId", "displayName", "specialty", "publicBio", "active"].sort(),
      );
    }
  });
});

describe("Public MCP protocol isolation", () => {
  it("exposes exactly the seven required public tools", async () => {
    const response = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response.result as {
      tools: Array<{
        name: string;
        inputSchema: {
          properties?: Record<string, unknown>;
          additionalProperties?: boolean;
        };
      }>;
    };

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      [...PUBLIC_MCP_TOOL_NAMES].sort(),
    );

    expect(result.tools).toHaveLength(7);
  });

  it("publishes an exact minimal input surface with no hidden arguments", async () => {
    const response = await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    const result = response.result as {
      tools: Array<{
        name: string;
        inputSchema: {
          properties?: Record<string, unknown>;
          additionalProperties?: boolean;
        };
      }>;
    };

    const expectedKeys: Record<string, string[]> = {
      get_clinic_info: [],
      get_opening_hours: ["day"],
      get_services: [],
      get_service_detail: ["serviceId"],
      search_services: ["query"],
      get_promotions: [],
      get_doctors_public: [],
    };

    for (const tool of result.tools) {
      expect(Object.keys(tool.inputSchema.properties ?? {}).sort()).toEqual(
        expectedKeys[tool.name].sort(),
      );
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it("rejects any unexpected extra input on strict public tools", async () => {
    for (const name of PUBLIC_MCP_TOOL_NAMES) {
      const baseArgs =
        name === "get_opening_hours"
          ? { day: "MONDAY" }
          : name === "get_service_detail"
            ? { serviceId: "SVC-001" }
            : name === "search_services"
              ? { query: "ตรวจ" }
              : {};

      const response = await callTool(name, {
        ...baseArgs,
        unexpected: "must-be-rejected",
      });
      const result = response.result as { isError?: boolean } | undefined;

      expect(
        response.error !== undefined || result?.isError === true,
        `${name} accepted an unexpected argument`,
      ).toBe(true);
    }
  });

  it("returns no service record for arbitrary non-service identity-like text", async () => {
    for (const query of [
      "IDENTITY-NAME-SENTINEL",
      "IDENTITY-NUMBER-SENTINEL",
      "IDENTITY-CONTACT-SENTINEL",
      "PERSONAL-APPOINTMENT-QUESTION-SENTINEL",
      "PERSONAL-QUEUE-QUESTION-SENTINEL",
      "PERSONAL-HISTORY-QUESTION-SENTINEL",
    ]) {
      expect(structured(await callTool("search_services", { query }))).toEqual({
        ok: true,
        source: "base-json",
        data: [],
      });
    }
  });

  it("communicates that personal/private identity is unavailable here", () => {
    expect(PUBLIC_MCP_INSTRUCTIONS).toContain(
      "this Public MCP has no authenticated patient identity",
    );
    expect(PUBLIC_MCP_INSTRUCTIONS).toContain(
      "never infer patient identity",
    );
    expect(PUBLIC_MCP_INSTRUCTIONS).toContain(
      "authenticated Clinic Cloud + Web app",
    );
  });
});

describe("Public MCP code boundary", () => {
  it("imports only the public data boundary and has no private/auth/storage dependency", () => {
    const source = [
      "src/mcp/public/tools.ts",
      "src/mcp/public/server.ts",
      "src/mcp/public/http.ts",
      "app/mcp/public/route.ts",
    ]
      .map((filePath) =>
        fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8"),
      )
      .join("\n");

    expect(source).toContain("@/src/data-access/public");
    expect(source).not.toContain("@/src/data-access/private");
    expect(source).not.toContain("src/data/private");
    expect(source).not.toContain("@/src/auth/");
    expect(source).not.toContain("requireCurrentUser");
    expect(source).not.toContain("getCurrentUser");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("browser-appointment-overlay");
    expect(source).not.toContain("@/src/mcp/staff");
  });
});
