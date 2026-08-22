import Modal from '@/Components/Modal';

function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDateTime(value) {
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const paymentLabels = {
    cash: 'Tunai',
    qris: 'QRIS',
    online: 'Online',
    credit: 'Kredit',
};

function StatusBadge({ status }) {
    const isVoided = status === 'voided';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isVoided
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-700'
            }`}
        >
            {isVoided ? 'Dibatalkan' : 'Selesai'}
        </span>
    );
}

export default function TransactionDetailModal({
    show,
    onClose,
    transaction,
    onPrint,
}) {
    if (!transaction) return null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <Modal.Header>
                <h2 className="text-lg font-semibold text-slate-900">
                    Detail Transaksi
                </h2>
            </Modal.Header>

            <Modal.Body>
                <p className="text-sm font-semibold text-indigo-600">
                    {transaction.invoice_number}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-slate-400">Tanggal</p>
                        <p className="mt-0.5 font-medium text-slate-800">
                            {formatDateTime(transaction.created_at)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Kasir</p>
                        <p className="mt-0.5 font-medium text-slate-800">
                            {transaction.user?.name ?? '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Metode</p>
                        <p className="mt-0.5 font-medium text-slate-800">
                            {paymentLabels[transaction.payment_method] ??
                                transaction.payment_method}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Status</p>
                        <div className="mt-0.5">
                            <StatusBadge status={transaction.status} />
                        </div>
                    </div>
                </div>

                <div className="mt-5 space-y-3 rounded-xl border border-slate-100 p-4">
                    {transaction.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-600">
                                {initials(item.product_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {item.product_name}
                                </p>
                                {item.price_option_name && (
                                    <p className="text-xs font-medium text-indigo-600">
                                        {item.price_option_name}
                                    </p>
                                )}
                                <p className="text-xs text-slate-400">
                                    {item.quantity} x{' '}
                                    {formatRupiah(item.unit_price)}
                                </p>
                                {item.discount_amount > 0 && (
                                    <p className="text-xs font-medium text-emerald-600">
                                        Diskon {item.discount_type === 'percentage' ? `${item.discount_value}%` : formatRupiah(item.discount_amount)}
                                    </p>
                                )}
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-slate-900">
                                {formatRupiah(item.subtotal)}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatRupiah(transaction.subtotal)}</span>
                    </div>
                    {transaction.discount_amount > 0 && (
                        <div className="flex items-center justify-between font-medium text-emerald-600">
                            <span>
                                Diskon
                                {transaction.discount_type === 'percentage'
                                    ? ` (${transaction.discount_value}%)`
                                    : ''}
                            </span>
                            <span>
                                -{formatRupiah(transaction.discount_amount)}
                            </span>
                        </div>
                    )}
                    {transaction.tax_amount > 0 && (
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Pajak</span>
                            <span>{formatRupiah(transaction.tax_amount)}</span>
                        </div>
                    )}
                    {transaction.service_charge_amount > 0 && (
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Biaya Layanan</span>
                            <span>
                                {formatRupiah(
                                    transaction.service_charge_amount,
                                )}
                            </span>
                        </div>
                    )}
                    {transaction.additional_fee > 0 && (
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Biaya Tambahan</span>
                            <span>
                                {formatRupiah(transaction.additional_fee)}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-base font-bold text-slate-900">
                        <span>Total</span>
                        <span>{formatRupiah(transaction.total)}</span>
                    </div>
                </div>

                {transaction.status === 'voided' && (
                    <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Audit pembatalan</p>
                        <dl className="mt-2 space-y-1.5 text-xs text-rose-700">
                            <div className="flex justify-between gap-4"><dt className="opacity-70">Dibatalkan oleh</dt><dd className="text-right font-semibold">{transaction.voider?.name ?? 'Akun terhapus'}</dd></div>
                            <div className="flex justify-between gap-4"><dt className="opacity-70">Waktu</dt><dd className="text-right font-semibold">{transaction.voided_at ? formatDateTime(transaction.voided_at) : '-'}</dd></div>
                            <div className="border-t border-rose-200/70 pt-2"><dt className="opacity-70">Alasan</dt><dd className="mt-1 font-semibold leading-5">{transaction.void_reason ?? '-'}</dd></div>
                        </dl>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => onPrint(transaction)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                    <i className="fi fi-rr-print" />
                    Cetak Ulang Struk
                </button>
            </Modal.Body>
        </Modal>
    );
}
