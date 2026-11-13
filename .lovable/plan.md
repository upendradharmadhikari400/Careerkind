# Production hardening for Career Kind

## What stays the same (platform limits)
Career Kind runs on Lovable's hosting and Lovable Cloud. Moving to Vercel, Upstash Redis or separate backend functions isn't supported here, so this plan gets the same results on the current setup.

## Audit summary (current state)
- **AI keys are safe already:** every AI call (assessment questions, reports, counselling chat) runs on the server. No AI key appears in browser settings.
- **Counselling chat already streams** word by word.
- **Assessment questions and reports wait for the full answer** before showing anything. That's the main thing users notice being slow.
- **Every user table is private to its owner.** Payments and coupons can only be written by the server.
- **Gaps:** one AI model with no backup, no protection against someone sending lots of requests, plain error messages, and no record of how long AI calls take.

## Phase 1: Faster-feeling results
- The assessment report fills in section by section as the AI writes it, instead of showing one spinner.
- Assessment questions stay all-at-once, because each one is short and needs its answer options complete.

## Phase 2: Backup AI model
- If the main model fails, is overloaded or takes too long before it starts replying, the app retries once on a second model through the same AI service.
- It never retries after a reply has started, so nobody gets billed twice or sees a half answer repeated.
- Out-of-credit errors don't trigger the backup. The app shows a clear message instead.

## Phase 3: Abuse protection and saving costs
- Per-account limits on AI use, for example 20 counselling messages per 10 minutes and 30 assessment steps per hour. A friendly "please wait a few minutes" message appears when someone hits the limit.
- This is a custom limit: the platform has no built-in one. It's counted per signed-in account, since only signed-in users can reach the AI.
- **No answer caching.** Every answer is personal to one child's profile, so saved answers would rarely match and could mix up private information.

## Phase 4: Database
- Add indexes for the lookups the app makes most (assessments by account and date, chat history by account and time).
- Recheck that every table is limited to its owner. The database's connection pooling is already managed for you.

## Phase 5: Clearer errors and monitoring
- Friendly messages when the AI is busy, unavailable or out of credits. Your typed message is kept so you can resend it.
- A short server log for each AI call: which model answered, how long it took, words used, and whether the backup was needed. No student details are logged.

## Technical details
- Report streaming: switch `generateAssessmentJson` report path to a server route (`/api/assessment-report`) using `streamText` + `Output.object` partial output via `toTextStreamResponse`, consumed with `experimental_useObject` on the client; questions stay on the existing server fn.
- Fallback: wrapper in `src/lib/ai-fallback.server.ts`, primary `openai/gpt-6-astra`, fallback chosen from `listModels()` on the same Responses surface; trigger only on pre-stream 429/5xx/timeout (first-chunk timeout about 20s); 402 is terminal.
- Rate limit: `ai_usage_events` table (user_id, kind, created_at, index), insert-and-count in the protected handlers, service-role write only; tests for the limits.
- Indexes: `assessments(user_id, updated_at desc)`, `counselling_messages(user_id, created_at, id)`, `student_profiles(user_id)` unique if absent.
- Logging: structured `console.log(JSON)` with run id, model, latency, usage, fallback flag; also viewable in AI Gateway request logs.
