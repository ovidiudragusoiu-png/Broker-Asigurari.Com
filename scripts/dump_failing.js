const fs = require("fs");
const d = JSON.parse(fs.readFileSync("debug_all.json", "utf8"));
const failing = ["UNIQA_MALPRAXIS","OMNIASIG_MALPRAXIS_GENERAL","SIGNAL_IDUNA_MALPRAXIS","ASIROM_MALPRAXIS"];
const comp = d.filter(l => l.path === "online/offers/malpraxis/comparator/v3");

failing.forEach(code => {
  const entry = comp.find(l => {
    const r = JSON.parse(l.requestBody || "{}");
    return r.productCode === code;
  });
  if (!entry) return;
  console.log("========================================");
  console.log("Timestamp: " + entry.timestamp);
  console.log("Vendor: " + code);
  console.log("HTTP Status: " + entry.responseStatus);
  console.log("========================================");
  console.log("");
  console.log("Request:");
  console.log(entry.requestBody);
  console.log("");
  console.log("Response:");
  console.log(entry.responseBody);
  console.log("");
  console.log("");
});
