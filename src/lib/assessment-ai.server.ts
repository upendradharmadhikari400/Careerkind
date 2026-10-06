import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './run-id.server.ts';

export async function generateAssessmentJson(apiKey: string, instructions: string, input: string, complete: boolean) {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    headers: {
      'Lovable-API-Key': apiKey,
      'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
    },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'),
    instructions,
    messages: [{ role: 'user', content: input }],
    maxRetries: 0,
    output: Output.object({ schema: complete ? z.object({
      snapshot: z.string(), interests: z.array(z.string()), strengths: z.array(z.string()),
      streams: z.array(z.string()), careers: z.array(z.string()), nextSteps: z.array(z.string()), alignment: z.string(),
    }) : z.object({ question: z.string(), reflection: z.string() }) }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        include: ['reasoning.encrypted_content'],
      },
    },
  });
  const output = await result.output;
  return JSON.stringify(output);
}
