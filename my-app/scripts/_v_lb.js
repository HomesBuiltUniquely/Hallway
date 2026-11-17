const fs = require('fs');
const path = require('path');
function loadEnv(file) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] == null) process.env[m[1]] = val;
  }
}
loadEnv(path.join(__dirname, '..', '.env.local'));
const jiti = require('jiti')(__filename, { interopDefault: true });
const m = jiti(path.join(__dirname, '..', 'src', 'lib', 'hallwayBookingFeedFromCrm.ts'));
(async () => {
  for (const p of ['mtd', 'qtd', 'all_time']) {
    const deals = await m.loadBookingDealsForPeriod(p);
    const rev = deals.reduce((s, d) => s + d.dealValue, 0);
    console.log(p, 'deals', deals.length, 'gross', rev);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
