import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

type Reply = {
  question?: string;
  reflection?: string;
  snapshot?: string;
  interests?: string[];
  strengths?: string[];
  streams?: string[];
  careers?: string[];
  nextSteps?: string[];
  alignment?: string;
};
type Answer = { role: string; question: string; answer: string };

export const advanceAssessment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        answer: z.string().trim().min(2).max(1500),
        question: z.string().trim().min(2).max(800),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: assessment, error: readError } = await context.supabase
      .from('assessments')
      .select('*')
      .eq('id', data.assessmentId)
      .eq('user_id', context.userId)
      .single();
    if (readError || !assessment || assessment.status !== 'in_progress') {
      throw new Error('Assessment not available.');
    }

    const { data: profile } = await context.supabase
      .from('student_profiles')
      .select('student_name,category,subjects,city')
      .eq('user_id', context.userId)
      .single();
    if (!profile) throw new Error('Complete the student profile before assessing.');

    const existing = Array.isArray(assessment.answers) ? (assessment.answers as Answer[]) : [];
    const role =
      assessment.mode === 'joint'
        ? existing.length % 2 === 0
          ? 'student'
          : 'parent'
        : assessment.mode;
    const lastAnswer = existing[existing.length - 1];
    const retrySavedAnswer = lastAnswer?.question === data.question && lastAnswer.answer === data.answer;
    const answers: Answer[] = retrySavedAnswer ? existing : [...existing, { role, question: data.question, answer: data.answer }];
    const { error: saveError } = await context.supabase
      .from('assessments')
      .update({ answers, updated_at: new Date().toISOString() })
      .eq('id', assessment.id)
      .eq('user_id', context.userId);
    if (saveError) throw new Error('Could not save your answer.');

    const complete = answers.length >= (assessment.mode === 'joint' ? 6 : 5);
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error('AI counselling is temporarily unavailable. Your answer was saved.');

    const task = complete
      ? 'Create a concise BASIC career profile. Return ONLY valid JSON with keys snapshot (2 sentences), interests (3 strings), strengths (3 strings), streams (2-3 broad academic streams), careers (3 exploration areas), nextSteps (3 practical actions), alignment (one balanced sentence if joint, otherwise empty string). Do not include specific colleges, admissions, scholarships, deadlines, fees, or guaranteed outcomes. Reflect uncertainty. In joint mode, distinguish student and parent viewpoints without taking sides.'
      : `Return ONLY valid JSON with keys question and reflection. Ask ONE specific, open-ended next question responding to the latest answer while exploring a different dimension: interests, personality, academic strengths versus marks, problem solving, work preferences, motivations, or constraints. In joint mode, the NEXT respondent is ${answers.length % 2 === 0 ? 'student' : 'parent'}; address them directly and fairly. reflection is one short supportive sentence. Do not diagnose or guarantee outcomes.`;

    try {
      const { generateAssessmentJson } = await import('./assessment-ai.server');
      const text = await generateAssessmentJson(
        apiKey,
        `You are a careful Indian career exploration guide for students and parents. The child may be a minor. Stay within educational and career guidance. Never request sensitive identifiers. Findings are tentative decision support, not guarantees. Student: ${profile.student_name}; level: ${profile.category}; subjects: ${profile.subjects || 'not provided'}; city: ${profile.city}; mode: ${assessment.mode}. ${task}`,
        JSON.stringify(answers),
        complete,
      );
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) as Reply;
      if (complete) {
        if (!parsed.snapshot || !Array.isArray(parsed.careers)) throw new Error('Invalid report');
        const { error } = await context.supabase
          .from('assessments')
          .update({ status: 'complete', result: parsed, updated_at: new Date().toISOString() })
          .eq('id', assessment.id)
          .eq('user_id', context.userId);
        if (error) throw error;
        return { complete: true, question: '', reflection: '', result: parsed };
      }
      if (!parsed.question) throw new Error('Invalid question');
      const { error: questionSaveError } = await context.supabase.from('assessments')
        .update({ result: { question: parsed.question, reflection: parsed.reflection || '' }, updated_at: new Date().toISOString() })
        .eq('id', assessment.id).eq('user_id', context.userId);
      if (questionSaveError) throw questionSaveError;
      return {
        complete: false,
        question: parsed.question,
        reflection: parsed.reflection || '',
        result: null,
      };
    } catch (error) {
      console.error('Assessment generation failed', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        if (error.statusCode === 402) throw new Error('AI usage is paused because credits are unavailable. The app owner can add credits in Settings → Plans & credits. Your answer is saved.');
        if (error.statusCode === 403) throw new Error('The AI service cannot access this model. The app owner needs to review AI access settings. Your answer is saved.');
        if (error.statusCode === 429) throw new Error('The AI service is busy. Wait a moment before trying again. Your answer is saved.');
      }
      throw new Error('AI counselling is temporarily unavailable. Your answer was saved; please try again later.');
    }
  });
