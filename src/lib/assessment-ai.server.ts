import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createLovableAiGatewayRunIdFetch } from './run-id.server.ts';

export async function generateAssessmentJson(apiKey: string, instructions: string, input: string) {
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
  const text = await result.text;
  if (!text.trim()) throw new Error('The assessment service returned an empty response.');
  return text;
}
