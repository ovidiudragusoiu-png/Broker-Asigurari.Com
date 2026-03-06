const fs = require("fs");
const d = JSON.parse(fs.readFileSync("debug_all.json", "utf8"));
const comp = d.filter(l => l.path === "online/offers/malpraxis/comparator/v3");

const ok = comp.find(l => {
  const r = JSON.parse(l.requestBody || "{}");
  return r.productCode === "GARANTA_MALPRAXIS";
});
const fail = comp.find(l => {
  const r = JSON.parse(l.requestBody || "{}");
  return r.productCode === "UNIQA_MALPRAXIS";
});

const okReq = JSON.parse(ok.requestBody);
const failReq = JSON.parse(fail.requestBody);

console.log("=== Garanta (OK) vs Uniqa (FAIL) ===");
const allKeys = new Set([...Object.keys(okReq), ...Object.keys(failReq)]);
for (const k of allKeys) {
  const a = JSON.stringify(okReq[k]);
  const b = JSON.stringify(failReq[k]);
  if (a !== b) {
    console.log(`${k}: ${a}  vs  ${b}`);
  }
}

console.log("\n=== Full Uniqa request ===");
console.log(JSON.stringify(failReq, null, 2));
