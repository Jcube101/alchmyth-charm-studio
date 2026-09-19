export type OrderMode = "ready" | "custom" | "bulk";
export type DeliveryMode = "standard" | "express";

export type PricingSelection = {
  quantity: number;
  charmCount: number;
  customBranding: boolean;
  delivery: DeliveryMode;
  sampleFirst: boolean;
  ownDesign: boolean;
};

type Tier = { minimum: number; discount: number };
export type ModeConfig = {
  label: string;
  helper: string;
  basePrice: number;
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  roundUpTo: number | null;
  tiers: Tier[];
  hasOptions: boolean;
};

const sharedOptions = {
  charms: [
    { count: 0, label: "None", perUnit: 0 },
    { count: 1, label: "1 charm", perUnit: 100 },
    { count: 2, label: "2 charms", perUnit: 180 },
    { count: 3, label: "3 charms", perUnit: 250 },
  ],
  branding: { label: "Custom branding (e.g. a flag)", perUnit: 50 },
  delivery: { standard: 1, express: 1.1 },
  sample: { label: "Paid sample first", fee: 750 },
  ownDesign: { label: "Submit your own design", fee: 100 },
};

export const pricingConfig = {
  "bag-charm": {
    modes: {
      ready: { label: "Ready Made", helper: "Our existing designs, ready to ship.", basePrice: 1899, minQuantity: 1, maxQuantity: 1000, quantityStep: 1, roundUpTo: null, tiers: [], hasOptions: false },
      custom: { label: "Custom Order", helper: "A design that isn't in our catalogue. 1 to 30 pieces. Upload your own sketch if you have one.", basePrice: 1899, minQuantity: 1, maxQuantity: 30, quantityStep: 1, roundUpTo: 10, tiers: [], hasOptions: true },
      bulk: { label: "Bulk Order", helper: "30+ pieces with volume discounts. Great for events, brands and gifting.", basePrice: 1800, minQuantity: 30, maxQuantity: 1000, quantityStep: 10, roundUpTo: 10, tiers: [{ minimum: 30, discount: 0.1 }, { minimum: 100, discount: 0.15 }, { minimum: 250, discount: 0.2 }], hasOptions: true },
    } satisfies Record<OrderMode, ModeConfig>,
    options: sharedOptions,
  },
};

export type PricingSku = keyof typeof pricingConfig;

export function defaultSelection(sku: PricingSku, mode: OrderMode): PricingSelection {
  const config = pricingConfig[sku].modes[mode];
  return { quantity: config.minQuantity, charmCount: 0, customBranding: false, delivery: "standard", sampleFirst: false, ownDesign: false };
}

export function snapQuantity(value: number, config: ModeConfig) {
  const finiteValue = Number.isFinite(value) ? value : config.minQuantity;
  const bounded = Math.min(config.maxQuantity, Math.max(config.minQuantity, finiteValue));
  const steps = Math.round((bounded - config.minQuantity) / config.quantityStep);
  return Math.min(config.maxQuantity, config.minQuantity + steps * config.quantityStep);
}

export function calculatePrice(sku: PricingSku, mode: OrderMode, selection: PricingSelection) {
  const productConfig = pricingConfig[sku];
  const config: ModeConfig = productConfig.modes[mode];
  const quantity = snapQuantity(selection.quantity, config);
  const activeTier = [...config.tiers].reverse().find((tier) => quantity >= tier.minimum);
  const discount = activeTier?.discount ?? 0;
  const tierIndex = activeTier ? config.tiers.indexOf(activeTier) : -1;
  const nextTier = config.tiers[tierIndex + 1];
  const charm = productConfig.options.charms.find((option) => option.count === selection.charmCount) ?? productConfig.options.charms[0];
  if (!charm) throw new Error("Pricing configuration requires a default charm option");

  const hasOptions = config.hasOptions;
  const branding = hasOptions && selection.customBranding ? productConfig.options.branding.perUnit : 0;
  const charmAmount = hasOptions ? charm.perUnit : 0;
  const deliveryMultiplier = hasOptions ? productConfig.options.delivery[selection.delivery] : 1;
  const discountedBase = config.basePrice * (1 - discount);
  const beforeDelivery = discountedBase + charmAmount + branding;
  const rawUnitPrice = beforeDelivery * deliveryMultiplier;
  const unitPrice = config.roundUpTo ? Math.ceil(rawUnitPrice / config.roundUpTo) * config.roundUpTo : rawUnitPrice;
  const sampleFee = hasOptions && selection.sampleFirst ? productConfig.options.sample.fee : 0;
  const ownDesignFee = hasOptions && selection.ownDesign ? productConfig.options.ownDesign.fee : 0;
  const oneTimeFees = sampleFee + ownDesignFee;
  const total = unitPrice * quantity + oneTimeFees;
  const listUnitPrice = (config.basePrice + charmAmount + branding) * deliveryMultiplier;
  const savings = mode === "bulk" ? Math.max(0, Math.round(listUnitPrice * quantity + oneTimeFees - total)) : 0;

  return {
    mode, quantity, unitPrice, total, oneTimeFees, discountedBase, savings,
    activeTier, nextTier, unitsToNextTier: nextTier ? nextTier.minimum - quantity : 0,
    lineItems: [
      { label: "Base price", amount: config.basePrice, kind: "per-unit" as const },
      ...(discount ? [{ label: `${Math.round(discount * 100)}% volume discount`, amount: -(config.basePrice * discount), kind: "per-unit" as const }] : []),
      ...(charmAmount ? [{ label: charm.label, amount: charmAmount, kind: "per-unit" as const }] : []),
      ...(branding ? [{ label: productConfig.options.branding.label, amount: branding, kind: "per-unit" as const }] : []),
      ...(hasOptions && selection.delivery === "express" ? [{ label: "Express delivery (10%)", amount: unitPrice - beforeDelivery, kind: "per-unit" as const }] : []),
      ...(sampleFee ? [{ label: productConfig.options.sample.label, amount: sampleFee, kind: "one-time" as const }] : []),
      ...(ownDesignFee ? [{ label: productConfig.options.ownDesign.label, amount: ownDesignFee, kind: "one-time" as const }] : []),
    ],
  };
}