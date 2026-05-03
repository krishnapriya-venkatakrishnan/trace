const Footer = () => {
    return (
        <footer className="bg-paper px-8 py-8 fixed w-full bottom-0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
            <div>
                Built with{' '}
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--font-fraunces)', color: 'var(--ink)', fontSize: 13 }}>
                    care
                </em>
                . Fully observable.
            </div>
            <div>Trace . 2026</div>
        </footer>
    )
}

export default Footer