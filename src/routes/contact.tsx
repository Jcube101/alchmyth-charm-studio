import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";
export const Route = createFileRoute("/contact")({ head: () => ({ meta: [
  { title: "Alchmyth" }, { name: "description", content: "Get in touch with Alchmyth about handmade orders, collaborations and questions." },
  { property: "og:title", content: "Contact — Alchmyth" }, { property: "og:description", content: "Say hello to the Alchmyth studio." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ContactPage });
function ContactPage() { return <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6"><span className="text-6xl">💌</span><h1 className="mt-6 font-display text-[40px] font-normal text-primary">Come say hello</h1><p className="mx-auto mt-5 max-w-xl text-[15px] font-light leading-7 text-muted-foreground">Questions, collaborations, wholesale daydreams, or just want to share where your charm ended up? We’d love to hear from you.</p><div className="mt-10 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2"><div className="bg-card p-6"><Mail className="mx-auto text-primary"/><p className="mt-3 font-semibold text-primary">Email the studio</p><p className="text-sm text-muted-foreground">Contact details coming soon</p></div><div className="bg-card p-6"><Instagram className="mx-auto text-primary"/><p className="mt-3 font-semibold text-primary">Instagram</p><p className="text-sm text-muted-foreground">@alchmyth</p></div></div></div>; }
