'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function activateVersion(id: string, templateId: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    // Deactivate all versions for this template first
    const { error: deactivateError } = await supabase
        .from('prompt_versions')
        .update({ is_active: false })
        .eq('template_id', templateId);

    if (deactivateError) return { error: deactivateError.message };

    // Activate the target version
    const { error: activateError } = await supabase
        .from('prompt_versions')
        .update({ is_active: true })
        .eq('id', id);

    if (activateError) return { error: activateError.message };

    revalidatePath('/settings/prompts');
    return {};
}

export async function createVersion(
    templateId: string,
    content: string,
    notes: string | null,
): Promise<{ error?: string }> {
    const supabase = await createClient();

    // Get max version for this template (maybeSingle handles 0-row case)
    const { data, error: maxError } = await supabase
        .from('prompt_versions')
        .select('version')
        .eq('template_id', templateId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (maxError) return { error: maxError.message };

    const nextVersion = (data?.version ?? 0) + 1;

    const { error: insertError } = await supabase
        .from('prompt_versions')
        .insert({ template_id: templateId, version: nextVersion, content, notes, is_active: false });

    if (insertError) return { error: insertError.message };

    revalidatePath('/settings/prompts');
    return {};
}
