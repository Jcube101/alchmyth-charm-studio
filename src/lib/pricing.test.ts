import { describe, expect, it } from "vitest";
import { calculatePrice, snapQuantity } from "./pricing";

const defaults = { quantity: 50, charmCount: 0, customBranding: false, delivery: "standard" as const, sampleFirst: false };
describe("bulk pricing", () => {
  it("calculates the MOQ example", () => {
    const result = calculatePrice("bag-charm", defaults);
    expect(result.unitPrice).toBe(1620);
    expect(result.total).toBe(81000);
  });
  it("calculates the 100-unit express example", () => {
    const result = calculatePrice("bag-charm", { ...defaults, quantity: 100, charmCount: 2, customBranding: true, delivery: "express" });
    expect(result.unitPrice).toBe(1940);
    expect(result.total).toBe(194000);
  });
  it("snaps and clamps quantity", () => {
    expect(snapQuantity(54)).toBe(50);
    expect(snapQuantity(56)).toBe(60);
    expect(snapQuantity(2000)).toBe(1000);
  });
  it("moves through tiers and applies one-time sample fees", () => {
    const result = calculatePrice("bag-charm", { ...defaults, quantity: 250, sampleFirst: true });
    expect(result.activeTier.discount).toBe(0.2);
    expect(result.total).toBe(360750);
  });
});
