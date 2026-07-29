import { Link } from '@inertiajs/react';

export default function Breadcrumb({ items = [] }) {
    return (
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
            <Link
                href={route('tenant.dashboard')}
                className="flex items-center transition hover:text-slate-600"
            >
                <i className="fi fi-rr-home" />
            </Link>

            {items.map((item, index) => (
                <span key={item.label} className="flex items-center gap-1.5">
                    <i className="fi fi-rr-angle-small-right text-xs" />
                    {item.href && index !== items.length - 1 ? (
                        <Link
                            href={item.href}
                            className="transition hover:text-slate-600"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span
                            className={
                                index === items.length - 1
                                    ? 'font-medium text-slate-600'
                                    : ''
                            }
                        >
                            {item.label}
                        </span>
                    )}
                </span>
            ))}
        </nav>
    );
}
