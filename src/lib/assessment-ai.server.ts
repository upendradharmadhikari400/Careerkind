import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './run-id.server.ts';

const reportSchema = z.object({
  snapshot: z.string(),
  interests: z.array(z.string()),
  strengths: z.array(z.string()),
  streams: z.array(z.string()),
  careers: z.array(z.string()),
  nextSteps: z.array(z.string()),
  alignment: z.string(),
});
const questionSchema = z.object({ question: z.string(), options: z.array(z.string()), reflection: z.string() });

function run(apiKey: string, instructions: string, input: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: runIdFetch.fetch,
  });
  return {
    model: provider.responses('openai/gpt-6-astra'),
    instructions,
    messages: [{ role: 'user' as const, content: input }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        include: ['reasoning.encrypted_content'],
      },
    },
  };
}

export async function generateAssessmentJson(apiKey: string, instructions: string, input: string, complete: boolean) {
  const base = run(apiKey, instructions, input);
  if (complete) {
    const result = streamText({ ...base, output: Output.object({ schema: reportSchema }) });
    return JSON.stringify(await result.output);
  }
  const result = streamText({ ...base, output: Output.object({ schema: questionSchema }) });
  return JSON.stringify(await result.output);
}
