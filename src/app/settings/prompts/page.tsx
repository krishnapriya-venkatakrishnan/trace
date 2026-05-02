import { createClient } from '@/lib/supabase/server';
import { PromptsClient } from './components/PromptsClient';

export interface PromptVersion {
    id: string;
    template_id: string;
    version: number;
    content: string;
    notes: string | null;
    is_active: boolean;
    created_at: string;
}

export interface TemplateGroup {
    template_id: string;
    versions: PromptVersion[]; // sorted descending by version
}

export default async function PromptsPage() {
    const supabase = await createClient();

    const { data: rows } = await supabase
        .from('prompt_versions')
        .select('*')
        .order('version', { ascending: false });

    const groupMap = new Map<string, PromptVersion[]>();
    for (const row of rows ?? []) {
        if (!groupMap.has(row.template_id)) groupMap.set(row.template_id, []);
        groupMap.get(row.template_id)!.push(row as PromptVersion);
    }

    const templates: TemplateGroup[] = Array.from(groupMap.entries()).map(
        ([template_id, versions]) => ({ template_id, versions }),
    );

    return <PromptsClient templates={templates} />;
}
