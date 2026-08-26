import Select from '@/Components/Select';

export default function OutletScopeFilter({ scope, onChange, className = '' }) {
    if (!scope?.can_filter) return null;

    const isCombined = scope.value === 'combined';
    const isBranches = scope.value === 'branches';
    const tone = isCombined
        ? 'border-indigo-200 bg-indigo-50/70 text-indigo-950 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100'
        : isBranches || scope.value.startsWith('branch:')
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100'
            : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100';

    return (
        <section className={`flex flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center ${tone} ${className}`} aria-label="Cakupan laporan toko">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-emerald-300 shadow-sm">
                <i className={`fi ${isCombined ? 'fi-rr-chart-tree-map' : 'fi-rr-shop'}`} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.16em] opacity-60 dark:opacity-75">Cakupan laporan</p>
                <p className="mt-0.5 truncate text-sm font-black">{scope.label}</p>
            </div>
            <Select
                value={scope.value}
                onChange={onChange}
                options={scope.options}
                searchable={scope.options.length > 6}
                searchPlaceholder="Cari cabang..."
                className="w-full sm:w-72"
                buttonClassName="border-transparent bg-white/90 font-bold shadow-sm"
            />
        </section>
    );
}
