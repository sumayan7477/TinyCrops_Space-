import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Sprout, Square } from "lucide-react";
import { PageHeader, Note } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Farm Assistant — TinyCrops" }, { name: "description", content: "Ask questions about your farms, grounded in your records." }, { property: "og:title", content: "AI Farm Assistant — TinyCrops" }, { property: "og:description", content: "Ask questions about your farms, grounded in your records." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = ["Which parcel needs attention today?", "When are outdoor working conditions less stressful?", "What should I inspect before irrigating?", "Are there wildfire warnings near my farm?"];

function Page() {
  const { farm } = useFarm();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ messages: next, farmId: farm?.id }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.text()) || `Request failed (${res.status})`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
        end.current?.scrollIntoView({ block: "end" });
      }
      if (!acc.trim()) setMsgs([...next, { role: "assistant", content: "_The assistant returned no answer. Please try again later._" }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsgs([...next, { role: "assistant", content: `_Error: ${(e as Error).message}_` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="AI Farm Assistant" description={`Answers use your saved records and live weather for ${farm?.name ?? "your farm"}. If data is missing, it will say so.`} />
      <div className="flex min-h-[60vh] flex-col rounded-lg border bg-card">
        <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
          {msgs.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary"><Sprout className="h-6 w-6" /></span>
              <p className="mt-3 font-medium">Ask about your fields</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGEST.map((s) => <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>{s}</Button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[80%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{m.content}</div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><Sprout className="h-4 w-4" /></span>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content || <span className="text-muted-foreground">Checking your records…</span>}</div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form className="flex items-end gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" className="min-h-11 resize-none" rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} aria-label="Message" />
          {busy ? <Button type="button" size="icon" variant="outline" onClick={() => abort.current?.abort()} aria-label="Stop"><Square className="h-4 w-4" /></Button>
            : <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>}
        </form>
      </div>
      <div className="mt-3"><Note>The assistant can be wrong. It never sees other users' data, and it does not take actions on your behalf.</Note></div>
    </>
  );
}
