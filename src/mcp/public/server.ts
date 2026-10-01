import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { WEEKDAYS } from "@/src/types/public-data";
import {
  getPublicClinicInfo,
  getPublicDoctors,
  getPublicOpeningHours,
  getPublicPromotions,
  getPublicServiceDetail,
  getPublicServices,
  searchPublicServices,
  type PublicMcpResult,
} from "@/src/mcp/public/tools";

export const PUBLIC_MCP_TOOL_NAMES = [
  "get_clinic_info",
  "get_opening_hours",
  "get_services",
  "get_service_detail",
  "search_services",
  "get_promotions",
  "get_doctors_public",
] as const;

export const PUBLIC_MCP_INSTRUCTIONS = `For Clinic Cloud + mock data:
- use the relevant Public MCP tool for public clinic facts;
- treat tool output as the source of truth for this mock dataset;
- never invent missing records;
- never silently substitute general knowledge for Clinic Cloud + dataset facts;
- distinguish Base Dataset facts from general advice;
- if a record is absent, say it is not available in the mock dataset;
- this Public MCP has no authenticated patient identity;
- never infer patient identity from a name, HN, phone number, or conversation context;
- personal appointments, patient history, private queue records, patient search, and internal staff identity are unavailable here;
- direct users to the authenticated Clinic Cloud + Web app for personal/private records.
These instructions apply only to Clinic Cloud + dataset facts and do not restrict normal answers outside that dataset.`;

const EMPTY_INPUT = z.object({}).strict();

function toolResult<T>(result: PublicMcpResult<T>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

export function createPublicMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "clinic-cloud-plus-public",
      version: "0.1.0",
    },
    {
      instructions: PUBLIC_MCP_INSTRUCTIONS,
    },
  );

  server.registerTool(
    "get_clinic_info",
    {
      title: "Get clinic information",
      description:
        "Return public Clinic Cloud + demo clinic name, description, phone, and address. No patient or authenticated-user data is available.",
      inputSchema: EMPTY_INPUT,
    },
    async () => toolResult(getPublicClinicInfo()),
  );

  server.registerTool(
    "get_opening_hours",
    {
      title: "Get opening hours",
      description:
        "Return the public weekly opening-hours schedule, or entries for one optional weekday.",
      inputSchema: z
        .object({
          day: z.enum(WEEKDAYS).optional(),
        })
        .strict(),
    },
    async ({ day }) => toolResult(getPublicOpeningHours(day)),
  );

  server.registerTool(
    "get_services",
    {
      title: "Get public services",
      description:
        "Return the public Clinic Cloud + service catalog, including stored prices, durations, descriptions, and active flags.",
      inputSchema: EMPTY_INPUT,
    },
    async () => toolResult(getPublicServices()),
  );

  server.registerTool(
    "get_service_detail",
    {
      title: "Get service detail",
      description:
        "Look up one public service by its service ID. Returns NOT_FOUND when the ID is absent from the mock dataset.",
      inputSchema: z
        .object({
          serviceId: z.string().trim().min(1),
        })
        .strict(),
    },
    async ({ serviceId }) => toolResult(getPublicServiceDetail(serviceId)),
  );

  server.registerTool(
    "search_services",
    {
      title: "Search public services",
      description:
        "Search only the public service catalog by service ID, name, or description. This tool cannot search patients, HNs, phone numbers, appointments, history, or private queue records.",
      inputSchema: z
        .object({
          query: z.string().trim().min(1),
        })
        .strict(),
    },
    async ({ query }) => toolResult(searchPublicServices(query)),
  );

  server.registerTool(
    "get_promotions",
    {
      title: "Get public promotions",
      description:
        "Return public promotion records from the Base Dataset with a derived ACTIVE, INACTIVE, UPCOMING, or EXPIRED status evaluated on the server date. No discount is invented beyond stored records.",
      inputSchema: EMPTY_INPUT,
    },
    async () => toolResult(getPublicPromotions()),
  );

  server.registerTool(
    "get_doctors_public",
    {
      title: "Get public doctors",
      description:
        "Return only public-safe doctor fields: ID, clinic ID, display name, specialty, public bio, and active flag. Internal schedules and patient relationships are never returned.",
      inputSchema: EMPTY_INPUT,
    },
    async () => toolResult(getPublicDoctors()),
  );

  return server;
}

export const publicMcpHandler = createMcpHandler(createPublicMcpServer);
