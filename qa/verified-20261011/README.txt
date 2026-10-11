QA-only snapshot for app 6aca8950491b4b2d74f6f62d. Never deploy this overlay to production.
Runtime allowlists replaced by qa-superadmin@rinno.es in rinno.ts and associations.js; AuditLog RLS likewise limited to that QA admin. Production source allowlists unchanged.
QaProvisionVerifiedRoles is closed (410), no privileged SDK remains. The temporary setup was ID/email/verified-app-bound and accepted no arbitrary role data. Fixture setup was NOT counted as authentication proof.
Tests .expr expect qaHarness Map(name,{client}) containing independently authenticated official Base44 SDK clients after email OTP verification. They do not contain passwords or tokens and must never run against another app. Some sequences depend on synthetic fixtures from previous tests.
Node debugger transport used solely to extend the agent-owned local test harness; never the browser or Base44 runtime. All remote requests used real user sessions; no session minting or RLS bypass in assertions.
These are hosted API functional checks, not evidence of complete deployed production UI or real Stripe delivery. See report for scope and evidence.
