'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { TimeRange } from '@/lib/dashboard/queries';

const options: { value: TimeRange; label: string }[] = [
    { value: '1h',  label: '1h'  },
    { value: '24h', label: '24h' },
    { value: '7d',  label: '7d'  },
    { value: '30d', label: '30d' },
];

export function TimeRangePicker({ current }: { current: TimeRange }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function select(range: TimeRange) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', range);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex gap-1 p-1 rounded-lg bg-paper-2">
            {options.map(({ value, label }) => (
                <button
                    key={value}
                    onClick={() => select(value)}
                    className={`
                        px-3 py-1 text-sm rounded-md transition-colors font-medium
                        ${current === value
                            ? 'bg-surface text-ink shadow-sm'
                            : 'text-ink-2 hover:text-ink'
                        }
                    `}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
