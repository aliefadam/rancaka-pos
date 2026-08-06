import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export default function CloseShiftModal({ show, onClose, summary }) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({ closing_cash: '' });

    useEffect(() => {
        if (!show) return;
        setData('closing_cash', String(summary?.expected_cash ?? ''));
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, summary?.expected_cash]);

    const cashDifference =
        data.closing_cash === '' || !summary
            ? null
            : Number(data.closing_cash) - summary.expected_cash;

    const submit = (e) => {
        e.preventDefault();

        post(route('tenant.shift.close'), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Tutup Shift
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Hitung uang di laci kas Anda dan masukkan
                            jumlahnya untuk menutup shift ini.
                        </p>

                        {summary && (
                            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">
                                        Total Transaksi
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {summary.transaction_count}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">
                                        Penjualan Tunai
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {formatRupiah(summary.cash_sales)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">
                                        Penjualan QRIS
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {formatRupiah(summary.qris_sales)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                                    <span>Uang Sistem</span>
                                    <span>
                                        {formatRupiah(summary.expected_cash)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="closing_cash"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Kas Aktual di Laci (Rp){' '}
                                <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="closing_cash"
                                type="number"
                                min="0"
                                value={data.closing_cash}
                                onChange={(e) =>
                                    setData('closing_cash', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="0"
                            />
                            <p className="mt-1.5 text-xs text-slate-400">
                                Hitung uang tunai fisik di laci. Modal akhir sistem
                                hanya berasal dari modal awal + penjualan tunai.
                            </p>
                            {errors.closing_cash && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.closing_cash}
                                </p>
                            )}
                        </div>

                        {cashDifference !== null && (
                            <div
                                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                                    cashDifference === 0
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                                <span>Selisih Kas</span>
                                <span>
                                    {cashDifference > 0 ? '+' : ''}
                                    {formatRupiah(cashDifference)}
                                </span>
                            </div>
                        )}
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        Tutup Shift
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
