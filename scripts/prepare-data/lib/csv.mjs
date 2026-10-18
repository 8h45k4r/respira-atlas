/** Minimal RFC4180 CSV parser — Fingertips quotes fields containing commas. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Parses into objects and asserts the header matches expectations exactly. */
export function parseCsvWithHeader(text, requiredColumns, context) {
  const rows = parseCsv(text).filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (rows.length === 0) {
    throw new Error(`Empty CSV response (${context})`);
  }
  const header = rows[0].map((h) => h.trim());
  const missing = requiredColumns.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `CSV schema drift (${context}): missing column(s) ${missing.join(', ')}. ` +
        `Received: ${header.join(' | ')}`,
    );
  }
  const index = new Map(header.map((h, i) => [h, i]));
  const records = rows.slice(1).map((cells) => {
    const record = {};
    for (const [key, i] of index) record[key] = cells[i] ?? '';
    return record;
  });
  return { header, records };
}

export function toCsv(header, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}
