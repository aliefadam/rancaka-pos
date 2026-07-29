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

const paymentMethods = [
    { value: 'cash', label: 'Tunai', icon: 'fi-rr-camera' },
    { value: 'qris', label: 'QRIS', icon: 'fi-rr-qrcode' },
];

export default function CartPanel({
    items,
    onIncrement,
    onDecrement,
    onRemove,
    onNoteChange,
    paymentMethod,
    onPaymentMethodChange,
    additionalFee,
    onAdditionalFeeChange,
    amountReceived,
    onAmountReceivedChange,
    subtotal,
    total,
    processing,
    onClear,
    onHold,
    onPay,
}) {
    const roundedTo5k = Math.ceil(total / 5000) * 5000;
    const receivedAmount =
        amountReceived === '' ? null : Number(amountReceived);
    const changeAmount =
        receivedAmount !== null ? receivedAmount - total : null;

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-4">
                <div className="flex items-center gap-2">
                    <i className="fi fi-rr-shopping-cart text-indigo-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                        Keranjang
                    </h3>
                </div>
                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={processing}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <i className="fi fi-rr-trash text-[11px]" />
                        Kosongkan
                    </button>
                )}
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pl-1 pr-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <i className="fi fi-rr-shopping-cart text-2xl" />
                        </span>
                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Keranjang kosong
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Pilih produk untuk mulai transaksi
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-2">
                        {items.map((item) => (
                            <div
                                key={item.product_id}
                                className="rounded-xl border border-slate-100 p-3 transition"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-600">
                                        {initials(item.name)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {item.name}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRemove(item.product_id)
                                                }
                                                className="shrink-0 text-slate-300 transition hover:text-rose-500"
                                            >
                                                <i className="fi fi-sr-trash text-xs" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            {formatRupiah(item.price)}
                                        </p>

                                        <input
                                            type="text"
                                            value={item.note}
                                            onChange={(e) =>
                                                onNoteChange(
                                                    item.product_id,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Catatan (contoh: pedas)"
                                            className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        />

                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onDecrement(
                                                            item.product_id,
                                                        )
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:scale-95"
                                                >
                                                    <i className="fi fi-rr-minus text-[10px]" />
                                                </button>
                                                <span className="w-5 text-center text-sm font-semibold text-slate-800">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onIncrement(
                                                            item.product_id,
                                                        )
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:scale-95"
                                                >
                                                    <i className="fi fi-rr-plus text-[10px]" />
                                                </button>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-900">
                                                {formatRupiah(
                                                    item.price *
                                                        item.quantity,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map((method) => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() =>
                                    onPaymentMethodChange(method.value)
                                }
                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                                    paymentMethod === method.value
                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <i className={`fi ${method.icon}`} />
                                {method.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        min="0"
                        value={additionalFee}
                        onChange={(e) =>
                            onAdditionalFeeChange(e.target.value)
                        }
                        placeholder="Biaya tambahan"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="-mt-1.5 text-xs text-slate-400">
                        Contoh: biaya layanan, bungkus, atau ongkir lokal.
                    </p>

                    {paymentMethod === 'cash' && (
                        <>
                            <input
                                type="number"
                                min="0"
                                value={amountReceived}
                                onChange={(e) =>
                                    onAmountReceivedChange(e.target.value)
                                }
                                placeholder="Jumlah uang diterima"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onAmountReceivedChange(String(total))
                                    }
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${
                                        receivedAmount === total
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                >
                                    Uang pas: {formatRupiah(total)}
                                </button>
                                {roundedTo5k !== total && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onAmountReceivedChange(
                                                String(roundedTo5k),
                                            )
                                        }
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${
                                            receivedAmount === roundedTo5k
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        Bulat 5rb: {formatRupiah(roundedTo5k)}
                                    </button>
                                )}
                            </div>

                            {receivedAmount !== null && (
                                <div
                                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
                                        changeAmount < 0
                                            ? 'bg-rose-50 text-rose-600'
                                            : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                >
                                    <span>
                                        {changeAmount < 0
                                            ? 'Kurang bayar'
                                            : 'Kembalian'}
                                    </span>
                                    <span>
                                        {formatRupiah(Math.abs(changeAmount))}
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    <div className="space-y-1.5 pt-1 text-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatRupiah(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Biaya tambahan</span>
                            <span>{formatRupiah(additionalFee)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-base font-bold text-slate-900">
                            <span>Total</span>
                            <span>{formatRupiah(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex shrink-0 gap-3 border-t border-slate-100 px-1 pt-4">
                <button
                    type="button"
                    onClick={onHold}
                    disabled={items.length === 0 || processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <i className="fi fi-rr-clock" />
                    Tahan
                </button>
                <button
                    type="button"
                    onClick={onPay}
                    disabled={items.length === 0 || processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? (
                        <i className="fi fi-sr-spinner animate-spin" />
                    ) : (
                        <i className="fi fi-rr-check" />
                    )}
                    Bayar
                </button>
            </div>
        </div>
    );
}
