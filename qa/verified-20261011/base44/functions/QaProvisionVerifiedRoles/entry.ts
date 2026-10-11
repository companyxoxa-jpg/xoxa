// QA fixtures provisioned. Closed before security assertions; no privileged SDK.
Deno.serve(() => Response.json({error:'QA provisioning closed'},{status:410}));
