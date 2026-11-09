# Streaming AI responses

## What's already streaming
- **Personal counselling chat** already streams: the counsellor's answer appears word by word as it's written. No change needed.

## What waits today
- **Free assessment questions**: each next question appears only once fully ready (usually 2–5 seconds).
- **Free assessment report**: the whole report appears at once after a longer wait (10–20 seconds), with only a spinner.

## What I'll change
1. **Assessment report streams in live** — the summary, strengths, career directions and other sections fill in on screen as the AI writes them, instead of one long spinner. The finished report is still saved only once complete, exactly as today.
2. **Assessment questions** — show the question text as it streams, with answer options appearing once ready, so the next question feels instant. Answers can't be tapped until the question is complete.
3. If the connection drops mid-stream, show the existing "try again" message; nothing partial is saved.

## What stays the same
- Same AI model, same questions, same report content, same prices and payment rules.
- AI calls stay on the server; nothing moves to the browser.

## Technical details
- New authenticated server routes `/api/assessment/question` and `/api/assessment/report` returning `streamText(... Output.object)` partial-object streams (auth via bearer token, ownership check on assessment row).
- Client uses `experimental_useObject` from `@ai-sdk/react` with the existing zod schemas; final object validated and saved server-side in `onFinish`.
- Counselling route (`/api/counselling`) untouched.
