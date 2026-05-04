import { ThemeToggleButton } from './ThemeToggleButton'
import Link from 'next/link'

const Navbar = () => {
    return (
    <header className='bg-paper flex items-center justify-between px-8 py-4 top-0 fixed w-full'>
        <div
            style={{
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'baseline',
                flexDirection: 'column',
            }}
        >
            <Link href="/">
                Trace
            </Link>
            <p className="text-sm max-lg:hidden" style={{ color: 'var(--muted)', textDecoration: 'none' }}>An AI research assistant — with the receipts</p>
        </div>

        <nav style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
            <Link href="/ask" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                className="hover:text-navy-muted! transition-colors duration-100">Ask</Link>
            <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                className="hover:text-navy-muted! transition-colors duration-100">Dashboard</Link>
            <Link href="/evals" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                className="hover:text-navy-muted! transition-colors duration-100">Evals</Link>
            <ThemeToggleButton />
        </nav>
    </header>
    )
}

export default Navbar