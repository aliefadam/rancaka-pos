export default function BulkSelectionBar({ count, totalLabel, actionLabel, onClear, onAction, icon = 'fi-rr-trash' }) {
    if (!count) return null;

    return (
        <div className="flex flex-col gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-sm">{count}</span>
                <div><p className="text-sm font-bold text-indigo-900">Data dipilih</p>{totalLabel && <p className="mt-0.5 text-xs text-indigo-600">Total {totalLabel}</p>}</div>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={onClear} className="flex-1 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 sm:flex-none">Batalkan pilihan</button>
                <button type="button" onClick={onAction} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 sm:flex-none"><i className={`fi ${icon}`} />{actionLabel}</button>
            </div>
        </div>
    );
}
