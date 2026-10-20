import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { COUNSELLOR_NAME } from '@/lib/counselling-config';

export const Route = createFileRoute('/counselling')({
  head: () => ({ meta: [
    { title: `Career counselling with ${COUNSELLOR_NAME} — CareerKind` },
    { name: 'description', content: 'Personal AI-powered career counselling built on your free assessment: courses, colleges, exams, costs and a clear roadmap.' },
    { property: 'og:title', content: `Career counselling with ${COUNSELLOR_NAME} — CareerKind` },
    { property: 'og:description', content: 'Personal AI-powered career counselling built on your free assessment.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: CounsellingPage,
});

const QUICK = ['Recommend best-fit courses for me', 'Suggest suitable colleges in India', 'Explore colleges abroad', 'Which entrance exams should I prepare for?', 'Scholarships I could look into', 'Make me a 90-day preparation plan', 'Compare two courses for me', 'Show alternative career paths'];

type LoadState = { kind: 'loading' } | { kind: 'signedOut' } | { kind: 'needsAssessment' } | { kind: 'ready'; firstName: string; messages: UIMessage[] };

function CounsellingPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return !cancelled && setState({ kind: 'signedOut' });
      const [{ data: profile }, { count }, { data: rows }] = await Promise.all([
        supabase.from('student_profiles').select('student_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'complete'),
        supabase.from('counselling_messages').select('id,role,parts').eq('user_id', user.id).order('created_at').limit(200),
      ]);
      if (cancelled) return;
      if (!profile || !count) return setState({ kind: 'needsAssessment' });
      setState({ kind: 'ready', firstName: profile.student_name.split(' ')[0] ?? profile.student_name, messages: (rows ?? []).map((r) => ({ id: r.id, role: r.role as 'user' | 'assistant', parts: r.parts as UIMessage['parts'] })) });
    })();
    return () => { cancelled = true; };
  }, []);

  return <main className="flex h-dvh flex-col bg-background">
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to workspace"><Link to="/"><ArrowLeft /></Link></Button>
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Compass className="size-5" /></div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-base font-extrabold">{COUNSELLOR_NAME}</h1><p className="truncate text-xs font-semibold text-primary">AI-powered Career Counsellor{state.kind === 'ready' ? ` · with ${state.firstName}` : ''}</p></div>
        <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold sm:inline">Free early access</span>
      </div>
    </header>
    {state.kind === 'loading' && <div className="grid flex-1 place-items-center"><Shimmer>Opening your counselling room…</Shimmer></div>}
    {state.kind === 'signedOut' && <Notice title="Please sign in" body="Sign in to continue your private counselling conversation." />}
    {state.kind === 'needsAssessment' && <Notice title="Complete a free assessment first" body={`${COUNSELLOR_NAME} builds on your assessment results, so please finish one free assessment before starting.`} />}
    {state.kind === 'ready' && <ChatRoom initial={state.messages} firstName={state.firstName} />}
  </main>;
}

function Notice({ title, body }: { title: string; body: string }) {
  return <div className="grid flex-1 place-items-center px-5"><div className="max-w-md text-center"><h2 className="text-xl font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p><Button asChild className="mt-5"><Link to="/">Go to my workspace</Link></Button></div></div>;
}

function ChatRoom({ initial, firstName }: { initial: UIMessage[]; firstName: string }) {
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const { messages, sendMessage, status, stop } = useChat({
    id: 'counselling',
    messages: initial,
    transport: new DefaultChatTransport({
      api: '/api/counselling',
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
    onError: (e) => {
      let msg = e.message;
      try { msg = (JSON.parse(e.message) as { error?: string }).error ?? msg; } catch { /* plain text */ }
      setError(msg || 'Something went wrong. Please try again.');
    },
  });
  const busy = status === 'submitted' || status === 'streaming';
  const send = (value: string) => { const v = value.trim(); if (!v || busy) return; setError(''); setText(''); void sendMessage({ text: v }); };

  return <>
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-4xl">
        {messages.length === 0 ? <ConversationEmptyState icon={<Compass className="size-8 text-primary" />} title={`Namaste ${firstName}, I'm ${COUNSELLOR_NAME}`} description="I've read your assessment. Pick a topic below or ask me anything about courses, colleges, exams, costs or careers." /> :
          messages.map((m) => <Message key={m.id} from={m.role}>
            <MessageContent className={m.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
              {m.parts.map((p, i) => p.type === 'text' ? (m.role === 'assistant' ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>) : null)}
            </MessageContent>
          </Message>)}
        {status === 'submitted' && <Shimmer className="text-sm">{`${COUNSELLOR_NAME} is thinking…`}</Shimmer>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    <div className="border-t bg-card">
      <div className="mx-auto w-full max-w-4xl px-4 py-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{QUICK.map((q) => <Button key={q} variant="outline" size="sm" className="shrink-0" disabled={busy} onClick={() => send(q)}>{q}</Button>)}</div>
        <PromptInput onSubmit={(msg: PromptInputMessage) => send(msg.text ?? '')}>
          <PromptInputTextarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about courses, colleges, exams, fees…" maxLength={2000} />
          <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} /></PromptInputFooter>
        </PromptInput>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0" />AI guidance, not guaranteed outcomes. Fees, dates and cut-offs may be outdated — always verify on official websites.</p>
      </div>
    </div>
  </>;
}
