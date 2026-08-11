# Local Dashboard Demo Login

## Goal

Provide one temporary member login that makes the user dashboard interactive on localhost while the remote Supabase project is unavailable. The bypass must never operate in preview, staging, or production.

## Access

- Email: `demo@top100.local`
- Password: `Top100Demo!2026`
- The login endpoint accepts these credentials only when the server is running in development and the request host is a loopback host (`localhost`, `127.0.0.1`, or `[::1]`).
- A successful login creates an HTTP-only, same-site cookie. The cookie is ignored outside that same development-and-loopback guard.
- The existing Supabase sign-in flow remains the default for every other credential and environment.

## Architecture

The login page first offers the credentials to a dedicated local-demo session endpoint. If the endpoint reports that the request is not the demo login, the page continues through the current Supabase flow unchanged.

Middleware recognizes a valid local-demo cookie for `/dashboard` and routes `/api/member/*` requests to a development-only catch-all demo API. The dashboard components continue calling their existing endpoints; they do not need environment-specific UI branches.

The demo API owns an in-memory fixture store on `globalThis`. It starts with a realistic awardee profile, notifications, posts, groups, messages, opportunities, invitations, and award data. Supported mutations update that store so the UI remains interactive until the development server restarts. Operations with external side effects, including payments and email delivery, return simulated success without contacting providers.

Signing out clears both the demo cookie and normal Supabase state. A reset action is not added because restarting the development server is sufficient for this temporary tool.

## Safety

Every entry point applies the development-and-loopback check independently. A missing or invalid demo cookie receives a not-found or unauthorized response. No service-role key or production data is used by the demo store. Admin routes are not included.

## Error Handling

Incorrect demo credentials fall through to the normal sign-in behavior. Demo API routes return the same response shapes and appropriate HTTP statuses as the member APIs they replace. Unsupported demo operations return a clear `501` response so gaps are visible during testing.

## Testing

Automated tests cover the loopback guard, credential validation, session-cookie recognition, middleware access behavior, initial fixture responses, and representative mutations. Final verification includes the focused test suite, the full test suite, a production build, and a browser walkthrough of login plus core dashboard interactions.
