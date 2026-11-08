// סיווג חכם של תנועות בנק/אשראי בעזרת Claude.
// מקבל תיאורי תנועות ורשימת סעיפים, ומחזיר לכל תנועה: סעיף, האם עסק, והסבר קצר בעברית.
// דורש סוד ANTHROPIC_API_KEY בהגדרות הפונקציות של Supabase.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1.3.0/helpers/zod";
import { z } from "npm:zod@3.25.76";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const Result = z.object({
  results: z.array(z.object({
    i: z.number().int(),
    category_id: z.string().nullable(),
    is_business: z.boolean(),
    explanation: z.string(),
  })),
});

const SYSTEM = `You classify transactions from Israeli bank and credit-card statements for a household budget app.
Descriptions are in Hebrew or English and are often truncated by the bank (e.g. "קיבוץ כפר הנ-י", "עמל.ערוץ ישיר10", "מפייבוקס שלי-י").
For each transaction, choose the single best category id from the provided list, or null if you genuinely cannot tell.
Only use ids from the list, and only categories whose kind matches the transaction type (income vs expense); "neutral" categories (card charges, internal transfers) fit either.
Set is_business to true only when the payment is clearly for running a business (software/SaaS tools, professional services, business supplies, advertising, tax payments for a business); everyday household spending is false.
Write "explanation" in Hebrew, at most 12 words: what this transaction most likely is, in plain words a non-expert understands (e.g. "כנראה עמלת ערוץ ישיר של בנק לאומי", "העברה שהתקבלה דרך אפליקציית פייבוקס"). If unsure, say so briefly ("לא ברור – כנראה ...").`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // רק חברי משק בית מחוברים יכולים להשתמש בפונקציה
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData?.user) return json({ error: "unauthorized" }, 401);
  const { data: mem } = await sb.from("household_members").select("household_id").eq("user_id", userData.user.id).maybeSingle();
  if (!mem) return json({ error: "no_household" }, 403);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "missing_key" }, 503);

  let body: { items?: { desc: string; type: string }[]; categories?: { id: string; name: string; group: string; kind: string; biz?: boolean }[] };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const items = (body.items ?? []).slice(0, 60).map((t, i) => ({ i, desc: String(t.desc ?? "").slice(0, 140), type: t.type === "income" ? "income" : "expense" }));
  const cats = (body.categories ?? []).slice(0, 200).map((c) => ({ id: String(c.id), name: String(c.name).slice(0, 80), kind: String(c.kind), business: !!c.biz }));
  if (!items.length || !cats.length) return json({ results: [] });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Categories (JSON):\n${JSON.stringify(cats)}\n\nTransactions (JSON):\n${JSON.stringify(items)}\n\nReturn one result per transaction, using the same "i".`,
      }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return json({ results: [] });
    const valid = new Set(cats.map((c) => c.id));
    const results = response.parsed_output.results
      .filter((r) => r.i >= 0 && r.i < items.length)
      .map((r) => ({ i: r.i, category_id: r.category_id && valid.has(r.category_id) ? r.category_id : null, is_business: r.is_business, explanation: r.explanation.slice(0, 120) }));
    return json({ results });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "bad_key" }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "api_error", status: e.status }, 502);
    return json({ error: "failed" }, 500);
  }
});
