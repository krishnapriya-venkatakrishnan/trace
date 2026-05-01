'use client';

import { createContext, useContext, useState } from 'react';

interface QueryContextValue {
    queryId: string | null;
    setQueryId: (id: string | null) => void;
    isStreaming: boolean;
    setIsStreaming: (v: boolean) => void;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryId, setQueryId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    return (
        <QueryContext.Provider value={{ queryId, setQueryId, isStreaming, setIsStreaming }}>
            {children}
        </QueryContext.Provider>
    );
}

export function useQuery() {
    const ctx = useContext(QueryContext);
    if (!ctx) throw new Error('useQuery must be used inside QueryProvider');
    return ctx;
}
