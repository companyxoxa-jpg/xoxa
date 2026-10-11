// Test-only adapter, aliased exclusively by vite.test.config.mjs.
async function call(body) {
  const res = await fetch('/__test_api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Test-Role': localStorage.getItem('test_role') || 'customer' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error), { status: res.status, response: { status: res.status, data } });
  return { data };
}
export const base44 = {
  app: { getPublicSettings: async () => ({ id: 'test-only', public_settings: {} }) },
  auth: { me: async () => (await call({ kind: 'me' })).data, loginViaEmailPassword: async () => ({ ok: true }), logout: () => {}, redirectToLogin: () => {} },
  functions: { invoke: (name, body) => call({ kind: 'function', name, body }) },
  entities: new Proxy({}, { get: (_, name) => ({ filter: (...args) => call({ kind: 'entity', name, args }).then(r => r.data), get: id => call({ kind: 'get', name, id }).then(r => r.data), list: () => call({ kind: 'entity', name, args: [{}] }).then(r => r.data) }) }),
};

