import { useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { calculatePrice, pricingConfig, snapQuantity, type PricingSelection } from "@/lib/pricing";
import { formatINR } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const initialSelection: PricingSelection = { quantity: 50, charmCount: 0, customBranding: false, delivery: "standard", sampleFirst: false };

export function BulkCalculator({ productName }: { productName: string }) {
  const [selection, setSelection] = useState(initialSelection);
  const config = pricingConfig["bag-charm"];
  const result = useMemo(() => calculatePrice("bag-charm", selection), [selection]);
  const updateQuantity = (quantity: number) => setSelection((current) => ({ ...current, quantity: snapQuantity(quantity) }));

  return <div className="rounded-card border border-border bg-card p-5 shadow-soft sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Made for your moment</p><h2 className="mt-1 font-display text-2xl">Build your bulk order</h2></div><Sparkles className="text-primary"/></div>
    <div className="mt-7 space-y-7">
      <fieldset><div className="flex items-center justify-between"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" min={config.moq} max={config.maxQuantity} step={config.quantityStep} value={selection.quantity} onChange={(event) => updateQuantity(Number(event.target.value))} className="w-24 text-center"/></div><Slider className="mt-5" min={config.moq} max={config.maxQuantity} step={config.quantityStep} value={[selection.quantity]} onValueChange={([value]) => updateQuantity(value ?? config.moq)}/><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{config.moq} minimum</span><span>{config.maxQuantity} units</span></div></fieldset>
      <fieldset><div className="flex items-center justify-between"><Label>Customised charms</Label><span className="text-sm font-semibold">{config.options.charms.find((item) => item.count === selection.charmCount)?.label}</span></div><Slider className="mt-5" min={0} max={3} step={1} value={[selection.charmCount]} onValueChange={([value]) => setSelection((current) => ({ ...current, charmCount: value ?? 0 }))}/><div className="mt-3 grid grid-cols-4 text-center text-[11px] text-muted-foreground">{config.options.charms.map((item) => <span key={item.count}>{item.count === 0 ? "None" : `+${formatINR(item.perUnit)}`}</span>)}</div></fieldset>
      <OptionSwitch label="Custom branding" description="e.g. a flag · +₹50/unit" checked={selection.customBranding} onCheckedChange={(checked) => setSelection((current) => ({ ...current, customBranding: checked }))}/>
      <fieldset><Label>Delivery</Label><div className="mt-3 grid grid-cols-2 gap-2">{(["standard", "express"] as const).map((delivery) => <Button type="button" key={delivery} variant={selection.delivery === delivery ? "default" : "outline"} onClick={() => setSelection((current) => ({ ...current, delivery }))}>{delivery === "standard" ? "Standard" : "Express · +10%"}</Button>)}</div></fieldset>
      <OptionSwitch label="Physical sample first" description="One-time ₹750 fee" checked={selection.sampleFirst} onCheckedChange={(checked) => setSelection((current) => ({ ...current, sampleFirst: checked }))}/>
    </div>
    <div className="my-7 h-px bg-border"/>
    <div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-muted-foreground">Price per unit</p><div className="mt-1 flex items-baseline gap-2"><strong className="font-display text-3xl">{formatINR(result.unitPrice)}</strong><s className="text-sm text-muted-foreground">{formatINR(config.basePrice)}</s></div><p className="mt-1 text-sm font-semibold text-primary">{Math.round(result.activeTier.discount * 100)}% volume discount</p></div><div className="sm:text-right"><p className="text-sm text-muted-foreground">Order total</p><strong className="mt-1 block font-display text-3xl">{formatINR(result.total)}</strong><p className="mt-1 text-sm text-primary">You save {formatINR(result.savings)}</p></div></div>
    <div className="mt-6 rounded-md bg-secondary p-4"><p className="text-sm font-semibold">Price breakdown</p><div className="mt-3 space-y-2">{result.lineItems.map((item) => <div className="flex justify-between text-sm" key={item.label}><span className="text-muted-foreground">{item.label}{item.kind === "per-unit" ? " / unit" : ""}</span><span>{item.amount < 0 ? "−" : "+"}{formatINR(Math.abs(item.amount))}</span></div>)}</div></div>
    <div className="mt-5"><p className="text-xs font-bold uppercase text-muted-foreground">Volume tiers</p><div className="mt-2 grid grid-cols-3 gap-2">{config.tiers.map((tier) => <div key={tier.minimum} className={cn("rounded-md border p-2 text-center text-xs", tier.minimum === result.activeTier.minimum ? "border-primary bg-accent font-bold text-primary" : "border-border")}><span className="block">{tier.minimum}+</span>{Math.round(tier.discount * 100)}% off</div>)}</div><p className="mt-3 text-sm text-muted-foreground">{result.nextTier ? `${result.unitsToNextTier} more units unlock ${Math.round(result.nextTier.discount * 100)}% off.` : "You’ve unlocked our best volume tier."}</p></div>
    <QuoteDialog productName={productName} selection={selection} result={result}/>
  </div>;
}

function OptionSwitch({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><div><Label>{label}</Label><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange}/></div>;
}

function QuoteDialog({ productName, selection, result }: { productName: string; selection: PricingSelection; result: ReturnType<typeof calculatePrice> }) {
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reference] = useState(() => `ALC-${Date.now().toString().slice(-6)}`);
  const summary = `${reference} — ${productName}\n${result.quantity} units · ${selection.charmCount || "No"} custom charm${selection.charmCount === 1 ? "" : "s"} · ${selection.customBranding ? "Custom branding" : "No branding"} · ${selection.delivery} delivery${selection.sampleFirst ? " · Sample first" : ""}\n${formatINR(result.unitPrice)} per unit · ${formatINR(result.total)} total`;
  return <Dialog onOpenChange={(open) => { if (!open) { setSubmitted(false); setCopied(false); } }}><DialogTrigger asChild><Button size="lg" className="mt-6 w-full">Request this quote</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-card"><DialogHeader><DialogTitle className="font-display text-2xl">{submitted ? "Your quote is ready" : "Tell us about your order"}</DialogTitle><DialogDescription>{submitted ? `Reference ${reference}` : `${result.quantity} handmade ${productName} charms, shaped around your occasion.`}</DialogDescription></DialogHeader>{submitted ? <div className="rounded-card bg-secondary p-5"><div className="mb-4 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Check/></div><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{summary}</pre><p className="mt-4 text-xs font-semibold">Quote valid for 7 days. 50% advance to confirm.</p><Button variant="outline" className="mt-5 w-full" onClick={async () => { await navigator.clipboard.writeText(summary); setCopied(true); }}><Copy/>{copied ? "Copied" : "Copy quote summary"}</Button></div> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><div><Label htmlFor="quote-name">Name</Label><Input id="quote-name" required className="mt-1"/></div><div><Label htmlFor="quote-contact">Email or WhatsApp</Label><Input id="quote-contact" required className="mt-1"/></div><div><Label htmlFor="quote-event">Event or occasion</Label><Input id="quote-event" placeholder="Wedding, launch, gifting…" className="mt-1"/></div><div><Label htmlFor="quote-date">Needed by</Label><Input id="quote-date" type="date" required className="mt-1"/></div><div><Label htmlFor="quote-notes">Notes</Label><Textarea id="quote-notes" placeholder="Colours, motifs, packaging or anything else" className="mt-1"/></div><Button type="submit" className="w-full">Create my quote</Button><p className="text-center text-xs text-muted-foreground">Nothing will be sent. This is a preview quote only.</p></form>}</DialogContent></Dialog>;
}
