import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { streamText } from 'ai';

type Reply = { question?: string; reflection?: string; snapshot?: string; interests?: string[]; strengths?: string[]; streams?: string[]; careers?: string[]; nextSteps?: string[]; alignment?: string };
type Answer = { role: string; question: string; answer: string };

export const advanceAssessment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ assessmentId: z.string().uuid(), answer: z.string().trim().min(2).max(1500), question: z.string().trim().min(2).max(800) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: assessment, error: readError } = await context.supabase.from('assessments').select('*').eq('id', data.assessmentId).eq('user_id', context.userId).single();
    if (readError || !assessment || assessment.status !== 'in_progress') throw new Error('Assessment not available.');
    const { data: profile } = await context.supabase.from('student_profiles').select('student_name,category,subjects,city').eq('user_id', context.userId).single();
    if (!profile) throw new Error('Complete the student profile before assessing.');
    const existing = Array.isArray(assessment.answers) ? assessment.answers as Answer[] : [];
    const role = assessment.mode === 'joint' ? (existing.length % 2 === 0 ? 'student' : 'parent') : assessment.mode;
    const answers: Answer[] = [...existing, { role, question: data.question, answer: data.answer }];
    const { error: saveError } = await context.supabase.from('assessments').update({ answers, updated_at: new Date().toISOString() }).eq('id', assessment.id).eq('user_id', context.userId);
    if (saveError) throw new Error('Could not save your answer.');
    const complete = answers.length >= (assessment.mode === 'joint' ? 6 : 5);
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error('AI counselling is temporarily unavailable. Your answer was saved.');
    try {
      const { createLovableAiGatewayProvider } = await import('./gateway-helpers.server');
      const provider = createLovableAiGatewayProvider(key, undefined, { baseURL: 'https://ai.gateway.lovable.dev' });
      const prompt = complete
        ? `Create a concise BASIC career profile from the assessment. Return ONLY valid JSON with keys snapshot (2 sentences), interests (3 strings), strengths (3 strings), streams (2-3 broad academic streams), careers (3 exploration areas), nextSteps (3 practical actions), alignment (one short balanced sentence if joint, otherwise empty string). No specific college, admission, scholarship, deadline, fee or guaranteed outcome. Reflect uncertainty. For joint mode distinguish student and parent viewpoints without taking sides.`
        : `Return ONLY valid JSON with keys question and reflection. Ask ONE specific open-ended question that responds to the latest answer and explores a different dimension among interests, personality, academic strengths versus marks, problem solving, work preferences, motivations or constraints. For joint mode alternate perspectives: the NEXT respondent is ${answers.length % 2 === 0 ? 'student' : 'parent'}; address them directly, fairly and without assuming agreement. reflection is one short supportive sentence about the last answer. Do not diagnose or guarantee outcomes.`;
      const result = streamText({ model: provider('google/gemini-3.1-flash-lite'), system: `You are a careful Indian career exploration guide for students and parents. The child may be a minor. Stay within educational and career guidance. Do not request sensitive identifiers. Assessment findings are tentative, not guarantees. Student: ${profile.student_name}, level: ${profile.category}, subjects: ${profile.subjects || 'not provided'}, city: ${profile.city}. Mode: ${assessment.mode}. ${prompt}`, prompt: JSON.stringify(answers) });
      const text = await result.text;
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) as Reply;
      if (complete) {
        if (!parsed.snapshot || !Array.isArray(parsed.careers)) throw new Error('Invalid report');
        const { error } = await context.supabase.from('assessments').update({ status: 'complete', result: parsed, updated_at: new Date().toISOString() }).eq('id', assessment.id).eq('user_id', context.userId);
        if (error) throw error;
        return { complete: true, question: '', reflection: '', result: parsed };
      }
      if (!parsed.question) throw new Error('Invalid question');
      return { complete: false, question: parsed.question, reflection: parsed.reflection || '', result: null };
    } catch (error) {
      console.error('Assessment generation failed', error);
      throw new Error('AI counselling is temporarily unavailable. Your answer was saved; please try again later.');
    }
  });
