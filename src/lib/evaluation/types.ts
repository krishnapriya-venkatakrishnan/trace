export interface ExpectedProperties {
    must_mention?: string[];
    must_cite?: boolean;
    min_confidence?: number;
    max_length?: number;
}

export interface EvalCase {
    id: string;
    question: string;
    expected_properties: ExpectedProperties;
    notes: string | null;
    is_active: boolean;
    created_at: string;
}

export interface EvalRunRow {
    id: string;
    evaluation_id: string;
    prompt_version_id: string | null;
    query_id: string | null;
    passed: boolean;
    score: number | null;
    notes: string | null;
    failure_reasons: string[];
    created_at: string;
    // joined from prompt_versions
    prompt_version?: number | null;
    // joined from queries
    latency_ms?: number | null;
    cost_usd?: number | null;
}

export interface HistoryPoint {
    date: string;
    passRate: number;
    passed: number;
    total: number;
    /** Prompt version that first appeared on this date (for transition markers) */
    versionLabel?: string;
}
