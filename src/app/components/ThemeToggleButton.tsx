'use client';

import { useTheme } from '../ThemeContext';

export function ThemeToggleButton() {
    const { toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            aria-label="Toggle theme"
            style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                transition: 'color 120ms, border-color 120ms',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)';
                e.currentTarget.style.borderColor = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
            }}
        >
            ◐
        </button>
    );
}
