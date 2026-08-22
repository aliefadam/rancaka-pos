import Modal from '@/Components/Modal';

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

export default function ReceiptModal({ show, onClose, transaction, tenant }) {
    if (!transaction) return null;

    const isVoided = transaction.status === 'voided';
    const print = () => window.print();

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <Modal.Header>
                <h2 className="text-lg font-semibold text-slate-900">
                    {isVoided ? 'Struk Pembatalan' : 'Struk Transaksi'}
                </h2>
            </Modal.Header>

            <Modal.Body>
                <div className="receipt-paper">
                    <div className="text-center">
                        {tenant.logo_url && (
                            <img
                                src={tenant.logo_url}
                                alt={tenant.name}
                                className="mx-auto mb-2 h-12 w-12 rounded-lg object-cover"
                            />
                        )}
                        <p className="font-bold text-slate-900">
                            {tenant.name}
                        </p>
                        {tenant.address && (
                            <p className="mt-0.5 text-xs text-slate-400">
                                {tenant.address}
                            </p>
                        )}
                        {tenant.phone && (
                            <p className="text-xs text-slate-400">
                                {tenant.phone}
                            </p>
                        )}
                    </div>

                    {isVoided && (
                        <div className="mt-4 border-y-2 border-dashed border-rose-500 bg-rose-50 px-3 py-3 text-center text-rose-700">
                            <p className="text-base font-black tracking-widest">
                                TRANSAKSI DIBATALKAN
                            </p>
                            <p className="mt-1 text-[11px] font-medium">
                                Struk ini tidak berlaku sebagai bukti transaksi
                                penjualan
                            </p>
                        </div>
                    )}

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex items-center justify-between">
                            <span>No. Struk</span>
                            <span className="font-medium text-slate-700">
                                {transaction.invoice_number}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Tanggal</span>
                            <span className="font-medium text-slate-700">
                                {formatDateTime(transaction.created_at)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Kasir</span>
                            <span className="font-medium text-slate-700">
                                {transaction.user?.name ?? '-'}
                            </span>
                        </div>
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="space-y-2.5">
                        {transaction.items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-start justify-between gap-3"
                            >
                                <div>
                                    <p className="font-medium text-slate-800">
                                        {item.product_name}
                                    </p>
                                    {item.price_option_name && (
                                        <p className="text-[11px] font-medium text-indigo-600">
                                            {item.price_option_name}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400">
                                        {item.quantity} x{' '}
                                        {formatRupiah(item.unit_price)}
                                    </p>
                                </div>
                                <span className="shrink-0 font-medium text-slate-800">
                                    {formatRupiah(item.subtotal)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="space-y-1.5">
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
                                <span>
                                    {formatRupiah(transaction.tax_amount)}
                                </span>
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
                        <div className="flex items-center justify-between text-base font-bold text-slate-900">
                            <span>TOTAL</span>
                            <span>{formatRupiah(transaction.total)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Metode</span>
                            <span>
                                {paymentLabels[transaction.payment_method] ??
                                    transaction.payment_method}
                            </span>
                        </div>
                        {transaction.payment_method === 'cash' &&
                            transaction.amount_received !== null && (
                                <>
                                    <div className="flex items-center justify-between text-slate-500">
                                        <span>Uang Diterima</span>
                                        <span>
                                            {formatRupiah(
                                                transaction.amount_received,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between font-semibold text-slate-800">
                                        <span>Kembalian</span>
                                        <span>
                                            {formatRupiah(
                                                transaction.change_amount,
                                            )}
                                        </span>
                                    </div>
                                </>
                            )}
                        {transaction.payment_method === 'credit' &&
                            transaction.credit_sale && (
                                <>
                                    <div className="flex items-center justify-between text-slate-500">
                                        <span>Pelanggan</span>
                                        <span>
                                            {transaction.credit_sale.customer
                                                ?.name || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-500">
                                        <span>Sudah Dibayar</span>
                                        <span>
                                            {formatRupiah(
                                                transaction.credit_sale
                                                    .paid_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-1 font-bold text-slate-900">
                                        <span>Sisa Hutang</span>
                                        <span>
                                            {formatRupiah(
                                                Math.max(
                                                    transaction.credit_sale
                                                        .total_amount -
                                                        transaction.credit_sale
                                                            .paid_amount,
                                                    0,
                                                ),
                                            )}
                                        </span>
                                    </div>
                                </>
                            )}
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <p
                        className={`text-center text-xs italic ${
                            isVoided
                                ? 'font-semibold text-rose-600'
                                : 'text-slate-400'
                        }`}
                    >
                        {isVoided
                            ? 'Transaksi ini telah dibatalkan.'
                            : tenant.receipt_footer ||
                              'Terima kasih atas kunjungan Anda!'}
                    </p>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <button
                    type="button"
                    onClick={print}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    <i className="fi fi-rr-print" />
                    Cetak
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                    Selesai
                </button>
            </Modal.Footer>
        </Modal>
    );
}
