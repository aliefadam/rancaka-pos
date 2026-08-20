export default function GoogleAuthButton({ label = 'Lanjutkan dengan Google', href }) {
    return (
        <a href={href ?? route('auth.google.redirect')} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.29.32-1.88V7.5H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.5l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.8.5 3.84 1.5l2.86-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.35 2.62C7.2 7.76 9.4 6 12 6Z"/></svg>
            {label}
        </a>
    );
}
