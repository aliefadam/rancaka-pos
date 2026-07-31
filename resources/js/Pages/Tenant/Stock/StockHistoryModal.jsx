import Modal from '@/Components/Modal';

const typeLabels = {
    in: 'masuk',
    sale: 'keluar-transaksi',
    adjustment: 'penyesuaian',
};

const typeStyles = {
    in: 'bg-emerald-50 text-emerald-700',
    sale: 'bg-slate-100 text-slate-600',
    adjustment: 'bg-amber-50 text-amber-700',
};

function formatDateTime(value) {
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? num : num.toFixed(2);
}

export default function StockHistoryModal({
    show,
    onClose,
    entityLabel,
    history,
    loading,
    search,
    onSearchChange,
    onPageChange,
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <Modal.Header>
                <h2 className="text-lg font-semibold text-slate-900">
                    Riwayat Mutasi Stok {entityLabel}
                </h2>
            </Modal.Header>

            <Modal.Body>
                <div className="relative mb-4">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <i className="fi fi-rr-search" />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={`Cari ${entityLabel.toLowerCase()}...`}
                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                {loading || !history ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <i className="fi fi-rr-spinner animate-spin text-2xl text-slate-300" />
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <th className="py-2.5 pr-4 font-semibold">
                                            Tanggal
                                        </th>
                                        <th className="py-2.5 pr-4 font-semibold">
                                            {entityLabel}
                                        </th>
                                        <th className="py-2.5 pr-4 font-semibold">
                                            Tipe
                                        </th>
                                        <th className="py-2.5 pr-4 font-semibold">
                                            Jumlah
                                        </th>
                                        <th className="py-2.5 pr-4 font-semibold">
                                            Keterangan
                                        </th>
                                        <th className="py-2.5 font-semibold">
                                            Oleh
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.data.map((movement) => (
                                        <tr key={movement.id}>
                                            <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                                                {formatDateTime(
                                                    movement.created_at,
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 font-medium text-slate-800">
                                                {movement.stockable?.name ??
                                                    '-'}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        typeStyles[
                                                            movement.type
                                                        ] ??
                                                        'bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {typeLabels[
                                                        movement.type
                                                    ] ?? movement.type}
                                                </span>
                                            </td>
                                            <td
                                                className={`py-3 pr-4 font-semibold ${
                                                    movement.quantity < 0
                                                        ? 'text-rose-600'
                                                        : 'text-emerald-600'
                                                }`}
                                            >
                                                {movement.quantity > 0
                                                    ? '+'
                                                    : ''}
                                                {formatQuantity(
                                                    movement.quantity,
                                                )}{' '}
                                                {movement.stockable?.unit ??
                                                    'pcs'}
                                            </td>
                                            <td className="py-3 pr-4 text-slate-500">
                                                {movement.note ?? '-'}
                                            </td>
                                            <td className="py-3 text-slate-500">
                                                {movement.user?.name ?? '-'}
                                            </td>
                                        </tr>
                                    ))}

                                    {history.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-16 text-center text-sm text-slate-400"
                                            >
                                                Belum ada riwayat mutasi stok.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 divide-y divide-slate-100 lg:hidden">
                            {history.data.map((movement) => (
                                <div key={movement.id} className="pt-3 first:pt-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-medium text-slate-800">
                                            {movement.stockable?.name ?? '-'}
                                        </p>
                                        <span
                                            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                                typeStyles[movement.type] ??
                                                'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {typeLabels[movement.type] ??
                                                movement.type}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {formatDateTime(movement.created_at)}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span
                                            className={`font-semibold ${
                                                movement.quantity < 0
                                                    ? 'text-rose-600'
                                                    : 'text-emerald-600'
                                            }`}
                                        >
                                            {movement.quantity > 0 ? '+' : ''}
                                            {formatQuantity(
                                                movement.quantity,
                                            )}{' '}
                                            {movement.stockable?.unit ??
                                                'pcs'}
                                        </span>
                                        <span className="text-slate-400">
                                            {movement.user?.name ?? '-'}
                                        </span>
                                    </div>
                                    {movement.note && (
                                        <p className="mt-1 text-xs text-slate-400">
                                            {movement.note}
                                        </p>
                                    )}
                                </div>
                            ))}

                            {history.data.length === 0 && (
                                <p className="py-16 text-center text-sm text-slate-400">
                                    Belum ada riwayat mutasi stok.
                                </p>
                            )}
                        </div>

                        {history.data.length > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                                <p className="text-sm text-slate-500">
                                    Menampilkan {history.from}-{history.to}{' '}
                                    dari {history.total} data
                                </p>
                                <div className="flex flex-wrap items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={history.current_page <= 1}
                                        onClick={() =>
                                            onPageChange(
                                                history.current_page - 1,
                                            )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <i className="fi fi-rr-angle-small-left" />
                                    </button>
                                    {Array.from({
                                        length: history.last_page,
                                    }).map((_, index) => {
                                        const page = index + 1;
                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() =>
                                                    onPageChange(page)
                                                }
                                                className={`min-w-[2.25rem] rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
                                                    page ===
                                                    history.current_page
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={
                                            history.current_page >=
                                            history.last_page
                                        }
                                        onClick={() =>
                                            onPageChange(
                                                history.current_page + 1,
                                            )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <i className="fi fi-rr-angle-small-right" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
