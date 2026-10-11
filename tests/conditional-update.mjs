// Atomic in-memory adapter, matching the native conditional update contract.
export function matches(row, query) {
  return Object.entries(query).every(([key, value]) => key === '$or'
    ? value.some(q => matches(row, q)) : value === null ? row[key] == null : row[key] === value);
}
export function conditionalUpdate(rows, query, update) {
  const selected = rows.filter(r => matches(r, query));
  for (const row of selected) Object.assign(row, structuredClone(update.$set));
  return { success: true, updated: selected.length };
}
