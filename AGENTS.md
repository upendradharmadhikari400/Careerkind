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
- Premium counselling chat streams from the authenticated /api/counselling server route and stores one ongoing conversation per account in counselling_messages; access is free early access until payment verification exists, so never fake a "paid" state.
