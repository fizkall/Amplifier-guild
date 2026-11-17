// Kural tabanlı Türkçe triage: panik metni → SOS alanları.
// Her telefonda (WebGPU'suz eski cihazlarda da) çalışır, model indirmez.
// Yapay zekâ katmanı eklendiğinde bu modül hem yedek hem doğrulayıcı olarak kalır.

import { ENV, FLAGS } from "./protocol";

export interface TriageResult {
  urgency: number;
  people: number;
  flags: number;
  env: number;
  reasons: string[];
}

type Rule = { bit: number; label: string; exact?: string[]; prefix?: string[]; phrase?: string[] };

const FLAG_RULES: Rule[] = [
  { bit: FLAGS.SIKISMA, label: "sıkışma", prefix: ["sıkış", "mahsur", "kalkamı", "çıkamı", "kımıldayamı", "hareket edemi", "enkaz"], phrase: ["altında kald", "altındayım", "altında"] },
  { bit: FLAGS.KANAMA, label: "kanama", exact: ["kan"], prefix: ["kanıyor", "kanama", "kanlı", "kanıy", "kanıyo"] },
  { bit: FLAGS.KIRIK, label: "kırık", prefix: ["kırık", "kırıl", "kırdı"] },
  { bit: FLAGS.NEFES, label: "nefes", prefix: ["nefes", "boğul", "soluk"] },
  { bit: FLAGS.BILINC, label: "bilinç", prefix: ["bayıl", "bilinç", "bilinc", "uyanmı", "baygın"], phrase: ["kendinde değil", "tepki vermi", "cevap vermi"] },
  { bit: FLAGS.COCUK, label: "çocuk", prefix: ["çocu", "bebe", "oğlum", "kızım", "torun"] },
  { bit: FLAGS.YASLI, label: "yaşlı", prefix: ["yaşlı", "dede", "nine", "babaanne", "anneanne"] },
  { bit: FLAGS.HAMILE, label: "hamile", prefix: ["hamile", "gebe"] },
  { bit: FLAGS.KRONIK_ILAC, label: "kronik ilaç", prefix: ["insülin", "insulin", "diyabet", "diyaliz", "astım", "ilacım", "ilaçlar", "epilep", "kalp hasta"], phrase: ["şeker hasta", "tansiyon ilac"] },
  { bit: FLAGS.ENGELLI, label: "engelli", prefix: ["engelli", "tekerlekli", "yürüyemi", "göremi", "duyamı"] },
  { bit: FLAGS.EVCIL, label: "evcil hayvan", prefix: ["kedi", "köpe", "kuşum"] },
];

const ENV_RULES: Rule[] = [
  { bit: ENV.GAZ, label: "gaz", exact: ["gaz"], prefix: ["gaz kok", "doğalgaz", "doğal gaz"] },
  { bit: ENV.YANGIN, label: "yangın", prefix: ["yangın", "duman", "alev", "yanıyor"] },
  { bit: ENV.SU, label: "su baskını", phrase: ["su bas", "su doluyor", "su geliyor", "su yükseliyor", "sel"] },
  { bit: ENV.SOGUK, label: "soğuk", prefix: ["soğuk", "üşü", "dondu", "donuyor", "titri"] },
  { bit: ENV.YAGMUR, label: "yağmur", prefix: ["yağmur", "ıslak", "ıslan"] },
];

const NUMBER_WORDS: Record<string, number> = {
  bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
};

const COMPANIONS = ["oğlum", "kızım", "eşim", "karım", "kocam", "annem", "babam", "kardeşim", "ablam", "abim", "dedem", "ninem", "bebeğim", "çocuğum", "çocuklarım", "komşum", "torunum"];

const SAFE = ["iyiyim", "güvendeyim", "sağlam", "dışarıdayım", "kurtuldum"];

export function normalize(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
}

function tokens(norm: string): string[] {
  return norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function matches(rule: Rule, norm: string, toks: string[]): boolean {
  if (rule.exact?.some((w) => toks.includes(w))) return true;
  if (rule.prefix?.some((p) => (p.includes(" ") ? norm.includes(p) : toks.some((t) => t.startsWith(p))))) return true;
  if (rule.phrase?.some((p) => norm.includes(p))) return true;
  return false;
}

export function countPeople(norm: string, toks: string[]): number {
  const m = norm.match(/(\d{1,2})\s*(kişi|kisi|kişiyiz|kişiyiz)/);
  if (m) return Math.min(31, parseInt(m[1], 10));
  const w = norm.match(/(?:^|\s)(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)\s+kişi/u);
  if (w) return NUMBER_WORDS[w[1]];
  const companions = new Set(toks.filter((t) => COMPANIONS.some((c) => t.startsWith(c))));
  let n = 1 + companions.size;
  if (toks.some((t) => t.startsWith("çocuklarım"))) n += 1;
  if (toks.includes("biz") || toks.includes("bizi") || toks.some((t) => t.endsWith("iz") && t.startsWith("mahsur"))) n = Math.max(n, 2);
  return Math.min(31, n);
}

export function triage(text: string): TriageResult {
  const norm = normalize(text);
  const toks = tokens(norm);
  const reasons: string[] = [];
  let flags = 0;
  let env = 0;
  for (const r of FLAG_RULES) if (matches(r, norm, toks)) { flags |= r.bit; reasons.push(r.label); }
  for (const r of ENV_RULES) if (matches(r, norm, toks)) { env |= r.bit; reasons.push(r.label); }

  const people = norm ? countPeople(norm, toks) : 1;

  const lifeThreat = flags & (FLAGS.KANAMA | FLAGS.NEFES | FLAGS.BILINC);
  const vulnerable = flags & (FLAGS.COCUK | FLAGS.HAMILE | FLAGS.YASLI | FLAGS.KRONIK_ILAC);
  let urgency = 2;
  if (flags & FLAGS.SIKISMA) urgency += 1;
  if (lifeThreat) urgency += 2;
  if (vulnerable && (lifeThreat || flags & FLAGS.SIKISMA)) urgency += 1;
  if (env & (ENV.GAZ | ENV.YANGIN | ENV.SU)) urgency += 1;
  if (!flags && !env && SAFE.some((s) => toks.some((t) => t.startsWith(s)))) urgency = 1;
  urgency = Math.max(1, Math.min(5, urgency));

  return { urgency, people, flags, env, reasons };
}
