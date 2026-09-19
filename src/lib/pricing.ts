export type PricingSelection = {
  quantity: number;
  charmCount: number;
  customBranding: boolean;
  delivery: "standard" | "express";
  sampleFirst: boolean;
};

type PricingConfig = {
  basePrice: number;
  moq: number;
  maxQuantity: number;
  quantityStep: number;
  roundUpTo: number;
  tiers: { minimum: number; discount: number }[];
  options: {
    charms: { count: number; label: string; perUnit: number }[];
    branding: { label: string; perUnit: number };
    delivery: { standard: number; express: number };
    sample: { label: string; fee: number };
  };
};

export const pricingConfig: Record<"bag-charm", PricingConfig> = {
  "bag-charm": {
    basePrice: 1800, moq: 50, maxQuantity: 1000, quantityStep: 10, roundUpTo: 10,
    tiers: [{ minimum: 50, discount: 0.1 }, { minimum: 100, discount: 0.15 }, { minimum: 250, discount: 0.2 }],
    options: {
      charms: [
        { count: 0, label: "None", perUnit: 0 },
        { count: 1, label: "1 charm", perUnit: 100 },
        { count: 2, label: "2 charms", perUnit: 180 },
        { count: 3, label: "3 charms", perUnit: 250 },
      ],
      branding: { label: "Custom branding", perUnit: 50 },
      delivery: { standard: 1, express: 1.1 },
      sample: { label: "Physical sample first", fee: 750 },
    },
  },
};

export function snapQuantity(value: number, config = pricingConfig["bag-charm"]) {
  const bounded = Math.min(config.maxQuantity, Math.max(config.moq, Number.isFinite(value) ? value : config.moq));
  return Math.round(bounded / config.quantityStep) * config.quantityStep;
}

export function calculatePrice(sku: keyof typeof pricingConfig, selection: PricingSelection) {
  const config = pricingConfig[sku];
  const quantity = snapQuantity(selection.quantity, config);
  const fallbackTier = config.tiers[0];
  const fallbackCharm = config.options.charms[0];
  if (!fallbackTier || !fallbackCharm) throw new Error("Pricing configuration requires a base tier and charm option");
  const tier = [...config.tiers].reverse().find((item) => quantity >= item.minimum) ?? fallbackTier;
  const tierIndex = config.tiers.indexOf(tier);
  const nextTier = config.tiers[tierIndex + 1];
  const charm = config.options.charms.find((item) => item.count === selection.charmCount) ?? fallbackCharm;
  const branding = selection.customBranding ? config.options.branding.perUnit : 0;
  const deliveryMultiplier = config.options.delivery[selection.delivery];
  const discountedBase = config.basePrice * (1 - tier.discount);
  const subtotalPerUnit = (discountedBase + charm.perUnit + branding) * deliveryMultiplier;
  const unitPrice = Math.ceil(subtotalPerUnit / config.roundUpTo) * config.roundUpTo;
  const oneTimeFees = selection.sampleFirst ? config.options.sample.fee : 0;
  const total = unitPrice * quantity + oneTimeFees;
  const listPriceTotal = (config.basePrice + charm.perUnit + branding) * deliveryMultiplier * quantity + oneTimeFees;

  return {
    quantity, unitPrice, total, oneTimeFees, discountedBase,
    savings: Math.max(0, Math.round(listPriceTotal - total)),
    activeTier: tier,
    nextTier,
    unitsToNextTier: nextTier ? nextTier.minimum - quantity : 0,
    lineItems: [
      { label: "Base price", amount: config.basePrice, kind: "per-unit" as const },
      { label: `${Math.round(tier.discount * 100)}% volume discount`, amount: -(config.basePrice * tier.discount), kind: "per-unit" as const },
      ...(charm.perUnit ? [{ label: charm.label, amount: charm.perUnit, kind: "per-unit" as const }] : []),
      ...(branding ? [{ label: config.options.branding.label, amount: branding, kind: "per-unit" as const }] : []),
      ...(selection.delivery === "express" ? [{ label: "Express delivery (10%)", amount: unitPrice - (discountedBase + charm.perUnit + branding), kind: "per-unit" as const }] : []),
      ...(oneTimeFees ? [{ label: config.options.sample.label, amount: oneTimeFees, kind: "one-time" as const }] : []),
    ],
  };
}
