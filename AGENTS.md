<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep one child profile per authenticated account and store assessment history in user-scoped database tables; this protects minors' information and preserves progress.
- Generate adaptive counselling in an authenticated server function, not in the browser; this protects the AI key and prevents cross-account access.
- Keep premium presentation in a dedicated invitation component with centralized plan configuration; this preserves assessments and avoids conflicting prices.
- Premium counselling chat streams from the authenticated /api/counselling server route and stores one ongoing conversation per account in counselling_messages; new questions require a Razorpay payment verified server-side in razorpay.functions.ts (signature + order owner + captured status, Razorpay's payment time as verified_paid_at), so the client can never grant access.
- Store verified payment timestamps in counselling_access, writable only by trusted payment verification; use centralized counsellingAccess for question expiry before message writes or AI calls, and keep paginated history reads independent of expiry to preserve archive access.
- Education facts use hybrid official-source retrieval: a seeded source_records registry (read by authenticated users, written only by service role) matched by keywords in source-registry.ts, fetched on demand and cached in source-fetch.server.ts; the counsellor must cite official links with last-verified dates and never present retrieved facts as guaranteed current.
- Coupons are hash-only service-role records; a locked database function reserves global capacity before Razorpay order creation, reuses pending account reservations, and verification binds captured payment to the reserved order and amount. Pending reservations are retained for safe retries rather than released by client dismissal, preventing late payments from exceeding capacity.
- SubjectPicker and mergeSubjects handle predefined and custom subjects for both new and saved profiles using the existing private subjects field, so no parallel profile store is introduced.
- School partners are showcased on a dedicated public route; publish only owner-supplied confirmed school details, never invented endorsements.
