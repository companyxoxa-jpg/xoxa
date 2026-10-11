import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function loadHandler(name) {
  const directory = path.resolve('base44', 'functions', name);
  const entry = path.join(directory, 'entry.ts');
  const temporary = path.join(directory, `.test-entry-${crypto.randomUUID()}.mjs`);
  let source = await readFile(entry, 'utf8');
  source = source
    .replace(/import\s*\{\s*createClientFromRequest\s*\}\s*from\s*['"]npm:@base44\/sdk(?:@[^'"]+)?['"];?/, 'const createClientFromRequest = () => { throw new Error("Test client missing"); };')
    .replace(/export default async function\s*\(\s*req\s*\)\s*\{/, 'export default async function(req, injectedClient) {')
    .replace(/\bcreateClientFromRequest\(req\)/g, '(injectedClient || createClientFromRequest(req))');
  await writeFile(temporary, source, 'utf8');
  try {
    return (await import(`${pathToFileURL(temporary).href}?test=${Date.now()}`)).default;
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
