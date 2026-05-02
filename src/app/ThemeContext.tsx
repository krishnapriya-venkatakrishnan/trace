'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextValue {
    dark: boolean;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [dark, setDark] = useState(false);

    // Restore persisted preference after hydration (avoids SSR mismatch)
    useEffect(() => {
        try {
            const getTheme = async () => {
                if (localStorage.getItem('theme') === 'dark') {
                    setDark(true);
                    document.documentElement.setAttribute('data-theme', 'dark');
                }
            }
            getTheme();
        } catch {}
    }, []);

    function toggle() {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    }

    return (
        <ThemeContext.Provider value={{ dark, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
