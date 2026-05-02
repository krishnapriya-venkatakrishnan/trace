'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3Icon, MessageSquareIcon, UploadIcon } from 'lucide-react';

const links = [
    { href: '/ask',       icon: MessageSquareIcon, label: 'Ask'       },
    { href: '/upload',    icon: UploadIcon,        label: 'Upload'    },
    { href: '/dashboard', icon: BarChart3Icon,     label: 'Dashboard' },
];

export function NavSidebar() {
    const pathname = usePathname();

    return (
        <nav className="w-16 shrink-0 flex flex-col items-center gap-1 py-4 bg-navy border-r border-border-navy">
            <Link href="/" className="mb-4 text-white font-serif text-lg font-semibold tracking-tight">
                T
            </Link>

            {links.map(({ href, icon: Icon, label }) => {
                const active = pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        title={label}
                        className={`
                            w-10 h-10 flex items-center justify-center rounded-lg transition-colors
                            ${active
                                ? 'bg-white/10 text-white'
                                : 'text-white/50 hover:text-white hover:bg-white/05'
                            }
                        `}
                    >
                        <Icon size={18} />
                    </Link>
                );
            })}
        </nav>
    );
}
