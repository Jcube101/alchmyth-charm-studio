import { describe, expect, it } from "vitest";
import { calculatePrice, defaultSelection, pricingConfig, snapQuantity } from "./pricing";

describe("bag charm pricing", () => {
  it("calculates three ready-made units", () => {
    const result = calculatePrice("bag-charm", "ready", { ...defaultSelection("bag-charm", "ready"), quantity: 3 });
    expect(result.unitPrice).toBe(1899);
    expect(result.total).toBe(5697);
  });

  it("calculates the custom order example", () => {
    const result = calculatePrice("bag-charm", "custom", { ...defaultSelection("bag-charm", "custom"), quantity: 5, charmCount: 2, customBranding: true, delivery: "express", ownDesign: true });
    expect(result.unitPrice).toBe(2350);
    expect(result.total).toBe(11850);
  });

  it("calculates the bulk minimum example", () => {
    const result = calculatePrice("bag-charm", "bulk", defaultSelection("bag-charm", "bulk"));
    expect(result.unitPrice).toBe(1620);
    expect(result.total).toBe(48600);
  });

  it("calculates the 100-unit bulk express example", () => {
    const result = calculatePrice("bag-charm", "bulk", { ...defaultSelection("bag-charm", "bulk"), quantity: 100, charmCount: 2, customBranding: true, delivery: "express" });
    expect(result.unitPrice).toBe(1940);
    expect(result.total).toBe(194000);
  });

  it("clamps and snaps by mode", () => {
    const modes = pricingConfig["bag-charm"].modes;
    expect(snapQuantity(31, modes.custom)).toBe(30);
    expect(snapQuantity(34, modes.bulk)).toBe(30);
    expect(snapQuantity(36, modes.bulk)).toBe(40);
    expect(snapQuantity(2000, modes.ready)).toBe(1000);
  });

  it("adds both one-time fees once", () => {
    const result = calculatePrice("bag-charm", "custom", { ...defaultSelection("bag-charm", "custom"), quantity: 2, sampleFirst: true, ownDesign: true });
    expect(result.oneTimeFees).toBe(850);
    expect(result.total).toBe(4650);
  });
});