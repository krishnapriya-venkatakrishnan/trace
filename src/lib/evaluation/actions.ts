'use server';

import { createClient } from '@/lib/supabase/server';
import { runEvaluation } from './runner';
import type { EvalCase, EvalRunRow } from './types';

export async function runSingleEval(evalCase: EvalCase): Promise<EvalRunRow> {
    return runEvaluation(evalCase);
}

export async function loadEvals(): Promise<{ evals: EvalCase[]; runs: EvalRunRow[] }> {
    const supabase = await createClient();

    const [{ data: evals }, { data: runs }] = await Promise.all([
        supabase
            .from('evaluations')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true }),
        supabase
            .from('evaluation_runs')
            .select('*, prompt_versions(version)')
            .order('created_at', { ascending: false })
            .limit(200),
    ]);

    const mapped: EvalRunRow[] = (runs ?? []).map((r) => ({
        ...r,
        failure_reasons: r.failure_reasons ?? [],
        prompt_version: (r.prompt_versions as { version?: number } | null)?.version ?? null,
    }));

    return { evals: (evals ?? []) as EvalCase[], runs: mapped };
}
