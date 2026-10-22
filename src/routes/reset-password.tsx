import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset your password — CareerKind" },
    { name: "description", content: "Set a new password for your CareerKind account using the secure reset link we emailed you." },
    { property: "og:title", content: "Reset your password — CareerKind" },
    { property: "og:description", content: "Set a new password for your CareerKind account using the secure reset link we emailed you." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hash = window.location.hash;
    const isRecoveryLink = new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
        setChecking(false);
        return;
      }
      if (isRecoveryLink) {
        // The auth client may still be processing the recovery link; give it a moment.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const retry = await supabase.auth.getSession();
        if (cancelled) return;
        if (retry.data.session) setReady(true);
        else setMessage("This reset link has expired or was already used. Please request a new one from the sign-in page.");
      } else {
        setMessage("Open this page using the reset link we emailed you, or request a new one from the sign-in page.");
      }
      setChecking(false);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setDone(true);
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Brand />
        <div className="border bg-card p-7">
          <div className="grid size-11 place-items-center rounded-md bg-moss text-moss-foreground">
            <KeyRound className="size-5" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">Set a new password</h1>
          {checking ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Checking your reset link…</p>
          ) : done ? (
            <div className="mt-4 space-y-4">
              <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm leading-6 text-secondary-foreground">
                Your password has been updated. You can now use it to sign in.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to="/">Go to my workspace</Link>
              </Button>
            </div>
          ) : ready ? (
            <form onSubmit={submit} className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Type the same password again"
                />
              </div>
              {message && <p role="status" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="rounded-md bg-muted px-3 py-2 text-sm leading-6 text-ink-soft">{message}</p>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>This page only works with the secure reset link we emailed you. The link expires after one use.</p>
        </div>
      </div>
    </main>
  );
}
