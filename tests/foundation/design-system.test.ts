import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

function channelToLinear(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const normalized = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(normalized.slice(offset, offset + 2), 16)),
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("design system foundation", () => {
  it("uses the Clinic Cloud typography and semantic token foundation", () => {
    expect(layout).toContain("IBM_Plex_Sans_Thai");
    expect(globals).toContain("--font-ibm-plex-sans-thai");
    expect(globals).toContain("--color-surface-context");
    expect(globals).toContain("--color-attention");
    expect(globals).toContain("--color-success");
    expect(globals).toContain("--color-info");
    expect(globals).toContain("--color-status-scheduled");
    expect(globals).toContain("--spacing-page");
    expect(globals).toContain("--text-page-title");
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it.each([
    ["Clinic Ink on Mist", "#173B3A", "#F5F8F7"],
    ["Primary white on Clinical Teal", "#FFFFFF", "#0F766E"],
    ["Muted text on white", "#4A6361", "#FFFFFF"],
    ["Attention text on attention surface", "#A35D12", "#F8F4EA"],
    ["Success text on success surface", "#166534", "#EAF7F3"],
    ["Info text on info surface", "#1E3A8A", "#EEF4FF"],
    ["Destructive text on cancelled surface", "#B42318", "#FDECEA"],
  ])("%s meets WCAG AA text contrast", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["Light input border", "#6F918C", "#F5F8F7"],
    ["Dark input border", "#6C8F89", "#102A29"],
    ["Light focus ring", "#0F766E", "#F5F8F7"],
  ])("%s meets non-text contrast", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
