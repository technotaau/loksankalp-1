/* संकल्प साथी : तीन AI की अंधी परीक्षा
 *
 * वही 60 सवाल, वही नियम, वही जवाब-कोश, तीनों को। जवाब हर सवाल पर नए सिरे से
 * फेंटकर क, ख, ग नाम दिए जाते हैं, ताकि परामर्शदाता को पता न चले कि कौन सा
 * जवाब किसका है। असली नाम अलग फ़ाइल में रहते हैं, जो उन्हें नहीं दिखाई जाती।
 *
 * चलाना :  node pariksha.mjs
 * चाबियाँ environment से आती हैं, कहीं लिखी नहीं जातीं :
 *   ANTHROPIC_API_KEY, GEMINI_API_KEY, SARVAM_API_KEY
 * जिसकी चाबी न हो, वह अपने आप छूट जाता है।
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "nateeje");
fs.mkdirSync(OUT, { recursive: true });

const KB = JSON.parse(fs.readFileSync(path.join(HERE, "kb.json"), "utf8"));
const RULES = fs.readFileSync(path.join(HERE, "rules.txt"), "utf8");
const SYSTEM = RULES + "\n\nKNOWLEDGE BANK\n" + KB.map(e => `Q: ${e.q}\nA: ${e.a}`).join("\n\n");

const SAWAL = fs.readFileSync(path.join(HERE, "sawal.txt"), "utf8")
  .trim().split("\n").map(l => { const [q, topic] = l.split("|"); return { q: q.trim(), topic: (topic || "अन्य").trim() }; });

/* ---------------- तीनों को बुलाने के तरीक़े ---------------- */

async function claude(q) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: q }],
  });
  return {
    text: res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim(),
    usage: { in: res.usage.input_tokens, cached: res.usage.cache_read_input_tokens ?? 0, out: res.usage.output_tokens },
  };
}

async function gemini(q) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const r = await fetch(
    `${process.env.GEMINI_BASE || "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent`,
    { method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: q }] }],
        generationConfig: { maxOutputTokens: 600 },
      }) });
  if (!r.ok) throw new Error(`gemini ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join("\n").trim();
  const u = j.usageMetadata || {};
  return { text, usage: { in: u.promptTokenCount ?? 0, cached: u.cachedContentTokenCount ?? 0, out: u.candidatesTokenCount ?? 0 } };
}

async function sarvam(q) {
  const key = process.env.SARVAM_API_KEY;
  const model = process.env.SARVAM_MODEL || "sarvam-m";
  const r = await fetch(`${process.env.SARVAM_BASE || "https://api.sarvam.ai"}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": key },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: q }],
    }) });
  if (!r.ok) throw new Error(`sarvam ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const u = j.usage || {};
  return { text: (j.choices?.[0]?.message?.content || "").trim(),
           usage: { in: u.prompt_tokens ?? 0, cached: 0, out: u.completion_tokens ?? 0 } };
}

const SAB = [
  { id: "claude", naam: "Claude Haiku 4.5", env: "ANTHROPIC_API_KEY", fn: claude },
  { id: "gemini", naam: "Gemini Flash",     env: "GEMINI_API_KEY",    fn: gemini },
  { id: "sarvam", naam: "Sarvam",           env: "SARVAM_API_KEY",    fn: sarvam },
];

/* ---------------- चलाइए ---------------- */

const chale = SAB.filter(m => (process.env[m.env] || "").trim());
const chhute = SAB.filter(m => !(process.env[m.env] || "").trim());
if (chhute.length) console.log("चाबी नहीं मिली, छोड़ दिए :", chhute.map(m => `${m.naam} (${m.env})`).join(", "));
if (!chale.length) { console.error("किसी की भी चाबी नहीं मिली। कुछ नहीं चलाया।"); process.exit(1); }
console.log("परीक्षा में :", chale.map(m => m.naam).join(", "));
console.log("सवाल :", SAWAL.length, "| नियम और कोश :", SYSTEM.length, "अक्षर\n");

const sab = [];
const kharab = [];
const jod = Object.fromEntries(chale.map(m => [m.id, { in: 0, cached: 0, out: 0, fail: 0 }]));

for (let i = 0; i < SAWAL.length; i++) {
  const { q, topic } = SAWAL[i];
  const row = { n: i + 1, q, topic, jawab: {} };
  for (const m of chale) {
    try {
      const { text, usage } = await m.fn(q);
      row.jawab[m.id] = text;
      jod[m.id].in += usage.in; jod[m.id].cached += usage.cached; jod[m.id].out += usage.out;
    } catch (e) {
      row.jawab[m.id] = null;
      jod[m.id].fail++;
      kharab.push({ n: i + 1, model: m.id, err: String(e.message || e).slice(0, 160) });
    }
    await new Promise(r => setTimeout(r, 350));   // सबके साथ नरमी से
  }
  sab.push(row);
  process.stdout.write(`\r${i + 1}/${SAWAL.length} सवाल हो गए`);
}
console.log("\n");

/* ---------------- हर सवाल पर अलग से फेंटिए ---------------- */
const AKSHAR = ["क", "ख", "ग", "घ"];
const parde = [];      // परामर्शदाताओं के लिए
const chaabi = [];     // असली नाम, अलग फ़ाइल में

for (const row of sab) {
  const milne = chale.map(m => m.id).filter(id => row.jawab[id]);
  for (let i = milne.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [milne[i], milne[j]] = [milne[j], milne[i]]; }
  parde.push({ n: row.n, q: row.q, topic: row.topic, jawab: milne.map((id, k) => ({ chinh: AKSHAR[k], text: row.jawab[id] })) });
  chaabi.push({ n: row.n, q: row.q, map: Object.fromEntries(milne.map((id, k) => [AKSHAR[k], id])) });
}

fs.writeFileSync(path.join(OUT, "sab-jawab.json"), JSON.stringify(sab, null, 2));
fs.writeFileSync(path.join(OUT, "parde-ke-peeche.json"), JSON.stringify(chaabi, null, 2));
fs.writeFileSync(path.join(OUT, "parchi.json"), JSON.stringify(parde, null, 2));

/* ---------------- खर्च ---------------- */
const USD = 88;
const DAR = {   // ₹ प्रति 10 लाख token : भरा हुआ input, cache से पढ़ा input, output
  claude: [1.00 * USD, 0.10 * USD, 5.00 * USD],
  gemini: [0.75 * USD, 0.075 * USD, 3.75 * USD],
  sarvam: [29.28, 10.98, 73.20],
};
console.log("खर्च और नाकामी :");
let kul = 0;
for (const m of chale) {
  const u = jod[m.id], [ci, cc, co] = DAR[m.id];
  const rs = (u.in - u.cached) / 1e6 * ci + u.cached / 1e6 * cc + u.out / 1e6 * co;
  kul += rs;
  console.log(`  ${m.naam.padEnd(18)} ₹${rs.toFixed(2).padStart(7)}   token in ${u.in} (cache ${u.cached}), out ${u.out}${u.fail ? `, नाकाम ${u.fail}` : ""}`);
}
console.log(`  ${"कुल".padEnd(18)} ₹${kul.toFixed(2).padStart(7)}`);
if (kharab.length) {
  console.log("\nजो नाकाम रहे :");
  for (const k of kharab.slice(0, 10)) console.log(`  सवाल ${k.n} · ${k.model} · ${k.err}`);
  if (kharab.length > 10) console.log(`  और ${kharab.length - 10}`);
}
console.log(`\nफ़ाइलें ${OUT} में लिख दी गईं।`);
