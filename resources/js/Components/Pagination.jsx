import { Link } from '@inertiajs/react';

export default function Pagination({ links }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1">
            {links.map((link, index) =>
                link.url === null ? (
                    <span
                        key={index}
                        className="min-w-[2.25rem] rounded-lg px-3 py-1.5 text-center text-sm text-slate-300"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        preserveState
                        className={`min-w-[2.25rem] rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
                            link.active
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </div>
    );
}
