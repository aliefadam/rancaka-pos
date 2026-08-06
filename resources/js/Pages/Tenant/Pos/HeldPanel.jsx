import Modal from '@/Components/Modal';

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function HeldPanel({ show, onClose, heldTransactions, onResume, onDiscard }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <Modal.Header>
                <h2 className="text-lg font-semibold text-slate-900">
                    Transaksi Ditahan
                </h2>
            </Modal.Header>

            <Modal.Body>
                {heldTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <i className="fi fi-rr-clock text-2xl" />
                        </span>
                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Belum ada transaksi yang ditahan
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {heldTransactions.map((held) => (
                            <div
                                key={held.id}
                                className="rounded-xl border border-slate-200 p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            Transaksi #{held.id}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatTime(held.created_at)} ·{' '}
                                            {held.items.length} item
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {formatRupiah(held.total)}
                                    </p>
                                </div>

                                <p className="mt-2 truncate text-xs text-slate-500">
                                    {held.items
                                        .map(
                                            (item) =>
                                                `${item.quantity}x ${item.product_name}`,
                                        )
                                        .join(', ')}
                                </p>

                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onResume(held)}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
                                    >
                                        <i className="fi fi-rr-play-alt" />
                                        Lanjutkan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDiscard(held)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <i className="fi fi-rr-trash text-xs" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    Tutup
                </button>
            </Modal.Footer>
        </Modal>
    );
}
