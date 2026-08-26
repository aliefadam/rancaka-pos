import Modal from '@/Components/Modal';
import MoneyInput from '@/Components/MoneyInput';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export default function CloseShiftModal({ show, onClose, summary, heldCount = 0 }) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({ closing_cash: '0' });

    useEffect(() => {
        if (!show) return;
        setData('closing_cash', '0');
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

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

    const hasFinancialSummary = Boolean(summary);
    const expectedCash = Number(summary?.expected_cash ?? 0);
    const roundedCash = Math.floor(expectedCash / 100) * 100;
    const roundingDifference = roundedCash - expectedCash;
    const hasRoundingOption = hasFinancialSummary && roundingDifference !== 0;
    const closingCash = data.closing_cash === '' ? null : Number(data.closing_cash);
    const difference =
        closingCash === null || !hasFinancialSummary
            ? null
            : closingCash - expectedCash;
    const isExactCash = hasFinancialSummary && closingCash === expectedCash;
    const isRoundedCash =
        hasRoundingOption && closingCash === roundedCash;
    const isCashMatched =
        !hasFinancialSummary || isExactCash || isRoundedCash;

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

                        {heldCount > 0 && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                                <div className="flex items-start gap-3">
                                    <i className="fi fi-sr-triangle-warning mt-0.5 text-amber-600" />
                                    <div>
                                        <p className="font-bold">
                                            Shift belum dapat ditutup
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-amber-800">
                                            Masih ada {heldCount} transaksi
                                            ditahan. Selesaikan atau batalkan
                                            transaksi tersebut terlebih dahulu
                                            agar tidak hilang dari daftar kasir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {summary && (
                            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">
                                        Saldo Awal
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {formatRupiah(summary.opening_cash)}
                                    </span>
                                </div>
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
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Penjualan Online</span>
                                    <span className="font-medium text-slate-800">{formatRupiah(summary.online_sales)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Penjualan Kredit</span>
                                    <span className="font-medium text-slate-800">{formatRupiah(summary.credit_sales)}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1.5">
                                    <span className="font-medium text-emerald-700">
                                        Pembayaran Utang
                                    </span>
                                    <span className="font-semibold text-emerald-700">
                                        {formatRupiah(summary.debt_payments)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                                    <span className="font-semibold text-slate-700">Total Penjualan</span>
                                    <span className="font-bold text-slate-900">{formatRupiah(summary.total_sales)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                                    <span>Kas Seharusnya</span>
                                    <span>
                                        {formatRupiah(summary.expected_cash)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {hasRoundingOption && (
                            <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
                                <div className="flex items-start gap-3 border-b border-amber-200/70 px-4 py-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                        <i className="fi fi-rr-coins" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-amber-950">
                                            Pembulatan Uang Laci
                                        </p>
                                        <p className="mt-0.5 text-xs leading-5 text-amber-800">
                                            Gunakan nominal pecahan Rp100 terdekat ke bawah jika uang receh tidak tersedia.
                                        </p>
                                    </div>
                                </div>

                                <div className="divide-y divide-amber-200/60 text-sm">
                                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5">
                                        <span className="text-amber-800">Kas sistem</span>
                                        <span className="font-semibold tabular-nums text-amber-950">
                                            {formatRupiah(expectedCash)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5">
                                        <span className="text-amber-800">Kas setelah pembulatan</span>
                                        <span className="font-bold tabular-nums text-amber-950">
                                            {formatRupiah(roundedCash)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5">
                                        <span className="text-amber-800">Selisih pembulatan</span>
                                        <span className="font-semibold tabular-nums text-amber-700">
                                            -{formatRupiah(Math.abs(roundingDifference))}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-amber-200/70 p-3">
                                    <button
                                        type="button"
                                        onClick={() => setData('closing_cash', String(roundedCash))}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    >
                                        <i className="fi fi-rr-arrow-small-down" />
                                        Gunakan {formatRupiah(roundedCash)}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!hasFinancialSummary && (
                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                                <div className="flex items-start gap-3">
                                    <i className="fi fi-rr-shield-check mt-0.5 text-sky-600" />
                                    <div>
                                        <p className="font-semibold">Penutupan kas terbatas</p>
                                        <p className="mt-1 text-xs leading-5 text-sky-700">
                                            Ringkasan omzet disembunyikan. Masukkan hasil hitung uang fisik di laci.
                                        </p>
                                    </div>
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
                            <MoneyInput
                                id="closing_cash"
                                min="0"
                                value={data.closing_cash}
                                onValueChange={(value) => setData('closing_cash', value)}
                                onFocus={(event) => event.currentTarget.select()}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="0"
                            />
                            {difference !== null && !isCashMatched && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                    <i className="fi fi-sr-exclamation" />
                                    {difference > 0
                                        ? `Kas lebih ${formatRupiah(difference)}`
                                        : `Kas kurang ${formatRupiah(Math.abs(difference))}`}
                                </div>
                            )}
                            {isExactCash && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                    <i className="fi fi-sr-check-circle" />
                                    Kas sesuai dengan saldo sistem
                                </div>
                            )}
                            {isRoundedCash && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                    <i className="fi fi-sr-check-circle" />
                                    Kas sesuai dengan nominal pembulatan Rp100
                                </div>
                            )}
                            <p className="mt-1.5 text-xs text-slate-400">
                                Hitung uang tunai fisik di laci. Modal akhir sistem
                                berasal dari modal awal + penjualan tunai + pembayaran utang.
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
                                        : isRoundedCash
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-rose-50 text-rose-700'
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
                            disabled={
                                processing ||
                                heldCount > 0 ||
                                closingCash === null ||
                                !isCashMatched
                            }
                        className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        {heldCount > 0
                            ? 'Selesaikan Transaksi Ditahan'
                            : hasFinancialSummary && !isCashMatched
                              ? 'Cocokkan atau Bulatkan Kas'
                              : 'Tutup Shift'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
