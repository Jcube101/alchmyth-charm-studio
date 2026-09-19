import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Copy, FileText, Info, Paperclip, ShoppingBag, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { calculatePrice, defaultSelection, pricingConfig, snapQuantity, type OrderMode, type PricingSelection, type PricingSku } from "@/lib/pricing";
import { formatINR, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";

const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const quoteSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Keep your name under 100 characters."),
  contact: z.string().trim().min(3, "Enter an email or WhatsApp number.").max(255, "Keep contact details under 255 characters."),
  event: z.string().trim().max(120, "Keep the occasion under 120 characters."),
  date: z.string().min(1, "Choose a needed-by date."),
  notes: z.string().trim().max(1000, "Keep notes under 1,000 characters."),
});

type QuoteFields = z.infer<typeof quoteSchema>;
type QuoteErrors = Partial<Record<keyof QuoteFields | "files" | "design", string>>;
const blankFields: QuoteFields = { name: "", contact: "", event: "", date: "", notes: "" };

export function OrderCalculator({ product, mode }: { product: Product; mode: OrderMode }) {
  const sku = product.pricingSku as PricingSku;
  const config = pricingConfig[sku];
  const modeConfig = config.modes[mode];
  const [selection, setSelection] = useState(() => defaultSelection(sku, mode));
  const [designFiles, setDesignFiles] = useState<File[]>([]);
  const [designDescription, setDesignDescription] = useState("");
  const [designError, setDesignError] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const result = useMemo(() => calculatePrice(sku, mode, selection), [mode, selection, sku]);

  const updateQuantity = (quantity: number) => setSelection((current) => ({ ...current, quantity: snapQuantity(quantity, modeConfig) }));
  const requestQuote = () => {
    if (mode === "custom" && selection.ownDesign && designFiles.length === 0 && !designDescription.trim()) {
      setDesignError("Add at least one file or describe your idea before requesting a quote.");
      return;
    }
    setDesignError("");
    setQuoteOpen(true);
  };

  return (
    <div className="border border-border bg-card p-5 sm:p-7">
      <QuantityControl mode={mode} quantity={selection.quantity} onChange={updateQuantity} />

      {mode === "ready" ? (
        <ReadyMadePurchase product={product} selection={selection} result={result} />
      ) : (
        <>
          <div className="mt-7 space-y-7 border-t border-border pt-7">
            <fieldset>
              <div className="flex items-center justify-between"><Label>Customised charms</Label><span className="text-sm font-semibold">{config.options.charms.find((item) => item.count === selection.charmCount)?.label}</span></div>
              <Slider aria-label="Number of customised charms" className="mt-5" min={0} max={3} step={1} value={[selection.charmCount]} onValueChange={([value]) => setSelection((current) => ({ ...current, charmCount: value ?? 0 }))} />
              <div className="mt-3 grid grid-cols-4 text-center text-[11px] text-muted-foreground">{config.options.charms.map((item) => <span key={item.count}>{item.count === 0 ? item.label : `+${formatINR(item.perUnit)}`}</span>)}</div>
            </fieldset>
            <OptionSwitch label={config.options.branding.label} description={`+${formatINR(config.options.branding.perUnit)}/unit`} checked={selection.customBranding} onCheckedChange={(customBranding) => setSelection((current) => ({ ...current, customBranding }))} />
            <fieldset><Label>Delivery</Label><div className="mt-3 grid grid-cols-2 gap-2">{(["standard", "express"] as const).map((delivery) => <Button type="button" key={delivery} variant={selection.delivery === delivery ? "default" : "outline"} onClick={() => setSelection((current) => ({ ...current, delivery }))}>{delivery === "standard" ? "Standard" : "Express · +10%"}</Button>)}</div></fieldset>
            <OptionSwitch label={config.options.sample.label} description={`One-time ${formatINR(config.options.sample.fee)} fee`} checked={selection.sampleFirst} onCheckedChange={(sampleFirst) => setSelection((current) => ({ ...current, sampleFirst }))} />
            <OptionSwitch label={mode === "bulk" ? "I'll submit my own design" : config.options.ownDesign.label} description={`One-time +${formatINR(config.options.ownDesign.fee)}`} checked={selection.ownDesign} onCheckedChange={(ownDesign) => { setSelection((current) => ({ ...current, ownDesign })); setDesignError(""); }} />
            {selection.ownDesign && mode === "custom" && <DesignSubmission files={designFiles} setFiles={setDesignFiles} description={designDescription} setDescription={setDesignDescription} error={designError} />}
            {selection.ownDesign && mode === "bulk" && <p className="flex gap-2 border-l-2 border-primary pl-3 text-sm leading-6 text-muted-foreground"><Info className="mt-1 size-4 shrink-0 text-primary" />You'll upload your design in the next step when you request the quote.</p>}
          </div>
          <CalculatorTotals mode={mode} result={result} />
          <Button size="lg" className="mt-6 w-full" onClick={requestQuote}>Request this quote</Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Quote valid for 7 days. 50% advance to confirm.</p>
          <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} productName={product.name} mode={mode} selection={selection} result={result} initialFiles={mode === "custom" ? designFiles : []} designDescription={designDescription} />
        </>
      )}
    </div>
  );
}

function QuantityControl({ mode, quantity, onChange }: { mode: OrderMode; quantity: number; onChange: (quantity: number) => void }) {
  const config = pricingConfig["bag-charm"].modes[mode];
  const [draft, setDraft] = useState(String(quantity));
  useEffect(() => setDraft(String(quantity)), [quantity]);
  const commit = () => { const next = snapQuantity(Number(draft), config); setDraft(String(next)); onChange(next); };
  return <fieldset><div className="flex items-center justify-between gap-4"><div><Label htmlFor={`${mode}-quantity`}>Quantity</Label><p className="mt-1 text-xs text-muted-foreground">{config.minQuantity}–{config.maxQuantity} · step {config.quantityStep}</p></div><Input id={`${mode}-quantity`} aria-label={`${config.label} quantity`} type="number" min={config.minQuantity} max={config.maxQuantity} step={config.quantityStep} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="w-24 text-center" /></div><Slider aria-label={`${config.label} quantity slider`} className="mt-5" min={config.minQuantity} max={config.maxQuantity} step={config.quantityStep} value={[quantity]} onValueChange={([value]) => onChange(value ?? config.minQuantity)} /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{config.minQuantity}</span><span>{config.maxQuantity}</span></div></fieldset>;
}

function ReadyMadePurchase({ product, selection, result }: { product: Product; selection: PricingSelection; result: ReturnType<typeof calculatePrice> }) {
  const { addToCart } = useStore();
  return <div className="mt-7 border-t border-border pt-6"><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Price per unit</p><strong className="mt-1 block font-display text-2xl text-primary">{formatINR(result.unitPrice)}</strong></div><div className="text-right"><p className="text-sm text-muted-foreground">Total</p><strong className="mt-1 block font-display text-2xl text-primary">{formatINR(result.total)}</strong></div></div><Button size="lg" className="mt-6 w-full" disabled={product.outOfStock} onClick={() => addToCart(product, selection.quantity)}><ShoppingBag />{product.outOfStock ? "Out of stock" : "Add to Cart"}</Button></div>;
}

function OptionSwitch({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><div><Label>{label}</Label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} /></div>;
}

function CalculatorTotals({ mode, result }: { mode: "custom" | "bulk"; result: ReturnType<typeof calculatePrice> }) {
  const tiers = pricingConfig["bag-charm"].modes.bulk.tiers;
  return <><div className="my-7 h-px bg-border" /><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-muted-foreground">Price per unit</p><strong className="mt-1 block font-display text-3xl text-primary">{formatINR(result.unitPrice)}</strong></div><div className="sm:text-right"><p className="text-sm text-muted-foreground">Order total</p><strong className="mt-1 block font-display text-3xl text-primary">{formatINR(result.total)}</strong>{mode === "bulk" && <p className="mt-1 text-sm text-primary">You save {formatINR(result.savings)}</p>}</div></div><div className="mt-6 border-y border-border bg-secondary p-4"><p className="text-sm font-semibold text-primary">Price breakdown</p><div className="mt-3 space-y-2">{result.lineItems.map((item) => <div className="flex justify-between gap-4 text-sm" key={item.label}><span className="text-muted-foreground">{item.label}{item.kind === "per-unit" ? " / unit" : ""}</span><span>{item.amount < 0 ? "−" : "+"}{formatINR(Math.abs(item.amount))}</span></div>)}</div></div>{mode === "bulk" && <div className="mt-5"><p className="text-xs font-bold uppercase text-muted-foreground">Volume tiers</p><div className="mt-2 grid grid-cols-3 gap-2">{tiers.map((tier) => <div key={tier.minimum} className={cn("border p-2 text-center text-xs", tier.minimum === result.activeTier?.minimum ? "border-primary bg-accent font-bold text-primary" : "border-border")}><span className="block">{tier.minimum}+</span>{Math.round(tier.discount * 100)}% off</div>)}</div><p className="mt-3 text-sm text-muted-foreground">{result.nextTier ? `${result.unitsToNextTier} more units unlock ${Math.round(result.nextTier.discount * 100)}% off.` : "You've unlocked our best volume tier."}</p></div>}</>;
}

function validFiles(files: File[]) { return files.filter((file) => acceptedTypes.includes(file.type)).slice(0, 3); }

function DesignSubmission({ files, setFiles, description, setDescription, error, compact = false }: { files: File[]; setFiles: (files: File[]) => void; description?: string | undefined; setDescription?: ((value: string) => void) | undefined; error?: string | undefined; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (incoming: File[]) => setFiles(validFiles([...files, ...incoming]));
  return <div className="space-y-3"><div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }} className="grid min-h-28 cursor-pointer place-items-center border border-dashed border-primary bg-secondary p-4 text-center"><div><Upload className="mx-auto size-5 text-primary" /><p className="mt-2 text-sm font-semibold">Drop files here or click to browse</p><p className="mt-1 text-xs text-muted-foreground">Images or PDF · up to 3 files</p></div><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></div>{files.length > 0 && <div className="grid gap-2">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 border border-border bg-background p-2"><FilePreview file={file} /><span className="min-w-0 flex-1 truncate text-xs">{file.name}</span><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`}><Trash2 /></Button></div>)}</div>}{!compact && setDescription && <div><Label htmlFor="design-description">Describe your idea</Label><Textarea id="design-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Colours, shape, details or inspiration…" className="mt-1" /></div>}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</div>;
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { if (!file.type.startsWith("image/")) return; const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  return url ? <img src={url} alt="" className="size-10 object-cover" /> : <span className="grid size-10 place-items-center bg-secondary"><FileText className="size-5 text-primary" /></span>;
}

function QuoteDialog({ open, onOpenChange, productName, mode, selection, result, initialFiles, designDescription }: { open: boolean; onOpenChange: (open: boolean) => void; productName: string; mode: "custom" | "bulk"; selection: PricingSelection; result: ReturnType<typeof calculatePrice>; initialFiles: File[]; designDescription: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reference] = useState(() => `ALC-${Date.now().toString().slice(-6)}`);
  const [fields, setFields] = useState(blankFields);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [errors, setErrors] = useState<QuoteErrors>({});
  useEffect(() => { if (open) setFiles(initialFiles); }, [initialFiles, open]);
  const config = pricingConfig["bag-charm"];
  const charmLabel = config.options.charms.find((item) => item.count === selection.charmCount)?.label ?? "None";
  const fileNames = files.map((file) => file.name);
  const summary = `${reference} — ${productName}\n${config.modes[mode].label} · ${result.quantity} units\nCustomised charms: ${charmLabel} · ${selection.customBranding ? "Custom branding" : "No branding"} · ${selection.delivery} delivery · ${selection.sampleFirst ? "Paid sample first" : "No sample"} · ${selection.ownDesign ? "Own design" : "Catalogue design"}${designDescription.trim() ? `\nDesign: ${designDescription.trim()}` : ""}${fileNames.length ? `\nFiles: ${fileNames.join(", ")}` : ""}\n${formatINR(result.unitPrice)} per unit · ${formatINR(result.total)} total`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = quoteSchema.safeParse(fields);
    const nextErrors: QuoteErrors = {};
    if (!parsed.success) parsed.error.issues.forEach((issue) => { const key = issue.path[0] as keyof QuoteFields; if (!nextErrors[key]) nextErrors[key] = issue.message; });
    if (mode === "bulk" && selection.ownDesign && files.length === 0) nextErrors.files = "Upload at least one design file.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(true);
  };
  const close = (nextOpen: boolean) => { onOpenChange(nextOpen); if (!nextOpen) { setSubmitted(false); setCopied(false); setFields(blankFields); setErrors({}); } };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-card"><DialogHeader><DialogTitle className="font-display text-2xl text-primary">{submitted ? "Your quote is ready" : "Tell us about your order"}</DialogTitle><DialogDescription>{submitted ? `Reference ${reference}` : `${config.modes[mode].label} · ${result.quantity} ${productName}`}</DialogDescription></DialogHeader>{submitted ? <div className="bg-secondary p-5"><div className="mb-4 grid size-10 place-items-center bg-primary text-primary-foreground"><Check /></div><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{summary}</pre><p className="mt-4 text-xs font-semibold">Quote valid for 7 days. 50% advance to confirm.</p><Button variant="outline" className="mt-5 w-full" onClick={async () => { await navigator.clipboard.writeText(summary); setCopied(true); }}><Copy />{copied ? "Copied" : "Copy quote summary"}</Button></div> : <form className="space-y-4" onSubmit={submit} noValidate><QuoteInput label="Name" name="name" value={fields.name} error={errors.name} onChange={(value) => setFields((current) => ({ ...current, name: value }))} /><QuoteInput label="Email or WhatsApp" name="contact" value={fields.contact} error={errors.contact} onChange={(value) => setFields((current) => ({ ...current, contact: value }))} /><QuoteInput label="Event or occasion" name="event" value={fields.event} error={errors.event} onChange={(value) => setFields((current) => ({ ...current, event: value }))} placeholder="Wedding, launch, gifting…" /><QuoteInput label="Needed by" name="date" value={fields.date} error={errors.date} onChange={(value) => setFields((current) => ({ ...current, date: value }))} type="date" />{mode === "bulk" && selection.ownDesign && <div><Label>Design files</Label><div className="mt-1"><DesignSubmission files={files} setFiles={setFiles} error={errors.files} compact /></div></div>}<div><Label htmlFor="quote-notes">Notes</Label><Textarea id="quote-notes" maxLength={1000} value={fields.notes} onChange={(event) => setFields((current) => ({ ...current, notes: event.target.value }))} placeholder="Colours, motifs, packaging or anything else" className="mt-1" />{errors.notes && <p className="mt-1 text-xs text-destructive">{errors.notes}</p>}</div><Button type="submit" className="w-full">Create my quote</Button><p className="text-center text-xs text-muted-foreground">Nothing will be sent. This is a preview quote only.</p></form>}</DialogContent></Dialog>;
}

function QuoteInput({ label, name, value, error, onChange, placeholder, type = "text" }: { label: string; name: keyof QuoteFields; value: string; error?: string | undefined; onChange: (value: string) => void; placeholder?: string | undefined; type?: string }) {
  return <div><Label htmlFor={`quote-${name}`}>{label}</Label><Input id={`quote-${name}`} type={type} maxLength={name === "event" ? 120 : name === "name" ? 100 : 255} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1" aria-invalid={Boolean(error)} />{error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}</div>;
}

export function DifferenceTooltip() {
  return <div className="group relative"><Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs"><Info />What's the difference?</Button><div role="tooltip" className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 border border-border bg-background p-4 text-left text-xs leading-5 shadow-soft group-hover:block group-focus-within:block"><p><strong className="text-primary">Ready Made:</strong> Our existing designs, ready to ship.</p><p className="mt-2"><strong className="text-primary">Custom Order:</strong> A design that isn't in our catalogue. 1 to 30 pieces. Upload your own sketch if you have one.</p><p className="mt-2"><strong className="text-primary">Bulk Order:</strong> 30+ pieces with volume discounts. Great for events, brands and gifting.</p></div></div>;
}