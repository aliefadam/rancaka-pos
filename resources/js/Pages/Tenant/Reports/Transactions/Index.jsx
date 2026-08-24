import Breadcrumb from '@/Components/Breadcrumb';
import BulkSelectionBar from '@/Components/BulkSelectionBar';
import Pagination from '@/Components/Pagination';
import PasswordConfirmDialog from '@/Components/PasswordConfirmDialog';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import TransactionDetailModal from '@/Pages/Tenant/Reports/Transactions/TransactionDetailModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'completed', label: 'Selesai' },
    { value: 'voided', label: 'Dibatalkan' },
];

const paymentFilterOptions = [
    { value: '', label: 'Semua Pembayaran' },
    { value: 'cash', label: 'Tunai' },
    { value: 'qris', label: 'QRIS' },
    { value: 'online', label: 'Online' },
    { value: 'credit', label: 'Kredit' },
];

const paymentLabels = {
    cash: 'Tunai',
    qris: 'QRIS',
    online: 'Online',
    credit: 'Kredit',
};

const paymentVisuals = {
    cash: { icon: 'fi-rr-money-bill-wave', accent: 'text-emerald-700', iconBg: 'bg-emerald-100' },
    qris: { icon: 'fi-rr-qr-scan', accent: 'text-sky-700', iconBg: 'bg-sky-100' },
    online: { icon: 'fi-rr-globe', accent: 'text-indigo-700', iconBg: 'bg-indigo-100' },
    credit: { icon: 'fi-rr-calendar-clock', accent: 'text-amber-700', iconBg: 'bg-amber-100' },
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

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

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
            <span
                className={`h-1.5 w-1.5 rounded-full ${isVoided ? 'bg-rose-500' : 'bg-emerald-500'}`}
            />
            {isVoided ? 'Dibatalkan' : 'Selesai'}
        </span>
    );
}

export default function Index({ transactions, paymentSummary, filters, limitedToOwnToday = false }) {
    const toast = useToast();
    const can = usePermission();

    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? filters.date ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? filters.date ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [paymentMethod, setPaymentMethod] = useState(filters.payment_method ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [detailTransaction, setDetailTransaction] = useState(null);
    const [selected, setSelected] = useState([]);
    const [voidTarget, setVoidTarget] = useState(null);
    const [voiding, setVoiding] = useState(false);
    const [voidErrors, setVoidErrors] = useState({});
    const isFirstRun = useRef(true);
    const selectableTransactions = transactions.data.filter(
        (transaction) => transaction.status === 'completed' && transaction.can_be_voided && can('transactions.delete'),
    );
    const selectedTransactions = transactions.data.filter((transaction) => selected.includes(transaction.id));
    const selectedTotal = selectedTransactions.reduce((sum, transaction) => sum + Number(transaction.total), 0);
    const pageSelectionKey = transactions.data.map((transaction) => transaction.id).join(',');

    useEffect(() => setSelected([]), [pageSelectionKey]);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('tenant.reports.transactions.index'),
                {
                    ...(search ? { search } : {}),
                    ...(dateFrom ? { date_from: dateFrom } : {}),
                    ...(dateTo ? { date_to: dateTo } : {}),
                    ...(status ? { status } : {}),
                    ...(paymentMethod ? { payment_method: paymentMethod } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['transactions', 'paymentSummary', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, dateFrom, dateTo, status, paymentMethod]);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['transactions', 'paymentSummary'],
            onFinish: () => setRefreshing(false),
        });
    };

    const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    const togglePage = () => {
        const pageIds = selectableTransactions.map((transaction) => transaction.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
        setSelected(allSelected ? selected.filter((id) => !pageIds.includes(id)) : [...new Set([...selected, ...pageIds])]);
    };
    const requestVoid = (transactionsToVoid) => {
        const items = Array.isArray(transactionsToVoid) ? transactionsToVoid : [transactionsToVoid];
        setVoidErrors({});
        setVoidTarget({
            ids: items.map((transaction) => transaction.id),
            count: items.length,
            total: items.reduce((sum, transaction) => sum + Number(transaction.total), 0),
            invoice: items.length === 1 ? items[0].invoice_number : null,
        });
    };
    const cancelVoid = () => {
        if (voiding) return;
        setVoidTarget(null);
    };

    const confirmVoid = (credentials) => {
        if (!voidTarget) return;

        setVoiding(true);
        setVoidErrors({});
        const bulk = voidTarget.ids.length > 1;
        router.patch(
            bulk
                ? route('tenant.reports.transactions.bulk-void')
                : route('tenant.reports.transactions.void', voidTarget.ids[0]),
            { ...credentials, ...(bulk ? { ids: voidTarget.ids } : {}) },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setVoidErrors(errors);
                    if (!errors.password && !errors.reason && !errors.transactions) toast.error('Gagal membatalkan transaksi. Silakan coba lagi.');
                },
                onSuccess: () => {
                    setVoidTarget(null);
                    setSelected([]);
                },
                onFinish: () => setVoiding(false),
            },
        );
    };

    const openReceiptFrom = (transaction) => {
        setDetailTransaction(null);
        router.visit(route('tenant.transactions.receipt', transaction.id));
    };

    return (
        <AdminLayout header="Riwayat Transaksi">
            <Head title="Riwayat Transaksi" />

            <Breadcrumb
                items={[{ label: 'Laporan' }, { label: 'Riwayat Transaksi' }]}
            />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Riwayat Transaksi
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {limitedToOwnToday
                            ? 'Transaksi Anda yang dibuat hari ini.'
                            : 'Seluruh transaksi kasir.'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refresh}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    <i
                        className={`fi fi-rr-refresh ${refreshing ? 'animate-spin' : ''}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {limitedToOwnToday && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
                        <i className="fi fi-rr-shield-check" />
                    </span>
                    <div>
                        <p className="font-semibold">Akses kasir terbatas</p>
                        <p className="mt-0.5 text-xs leading-5 text-sky-700">
                            Tanpa role, riwayat hanya menampilkan transaksi milik Anda pada hari ini.
                        </p>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div className="relative w-full sm:max-w-xs">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-search" />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari no. transaksi atau kasir..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {!limitedToOwnToday && (
                        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                            <label className="relative">
                                <span className="absolute -top-2 left-2.5 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dari</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo || undefined}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    aria-label="Tanggal mulai"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
                                />
                            </label>
                            <label className="relative">
                                <span className="absolute -top-2 left-2.5 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sampai</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    aria-label="Tanggal akhir"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
                                />
                            </label>
                        </div>
                    )}

                    <Select
                        value={status}
                        onChange={setStatus}
                        options={statusFilterOptions}
                        placeholder="Semua Status"
                        className="w-full sm:w-48"
                    />
                    <Select
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        options={paymentFilterOptions}
                        placeholder="Semua Pembayaran"
                        className="w-full sm:w-48"
                    />
                </div>

                <section className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6" aria-label="Ringkasan metode pembayaran">
                    <div className="mb-3 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ringkasan pembayaran</p>
                            <p className="mt-0.5 text-xs text-slate-400">Mengikuti rentang waktu dan filter transaksi</p>
                        </div>
                        <span className="hidden text-[11px] font-medium text-slate-400 sm:block">Seluruh halaman</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {paymentSummary.map((item) => {
                            const visual = paymentVisuals[item.method] ?? paymentVisuals.online;
                            const isActive = !paymentMethod || paymentMethod === item.method;

                            return (
                                <div
                                    key={item.method}
                                    className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 transition ${isActive ? 'border-slate-200 shadow-sm shadow-slate-200/50' : 'border-slate-100 opacity-50'}`}
                                >
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.iconBg} ${visual.accent}`}>
                                        <i className={`fi ${visual.icon}`} />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-semibold text-slate-500">{paymentLabels[item.method] ?? item.method}</p>
                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-500">{item.transaction_count}</span>
                                        </div>
                                        <p className={`mt-0.5 truncate text-base font-extrabold tabular-nums ${visual.accent}`}>{formatRupiah(item.total_amount)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <BulkSelectionBar
                    count={selected.length}
                    totalLabel={formatRupiah(selectedTotal)}
                    actionLabel="Batalkan transaksi"
                    icon="fi-rr-cross-circle"
                    onClear={() => setSelected([])}
                    onAction={() => requestVoid(selectedTransactions)}
                />

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {can('transactions.delete') && <th className="w-12 px-4 py-3.5"><input type="checkbox" checked={selectableTransactions.length > 0 && selectableTransactions.every((transaction) => selected.includes(transaction.id))} onChange={togglePage} disabled={selectableTransactions.length === 0} aria-label="Pilih semua transaksi yang dapat dibatalkan di halaman ini" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30" /></th>}
                                <th className="px-6 py-3.5 font-semibold">
                                    No. Transaksi
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Tanggal
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Kasir
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Total
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Metode
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Status
                                </th>
                                <th className="px-6 py-3.5 text-right font-semibold">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.data.map((transaction) => (
                                <tr
                                    key={transaction.id}
                                    className={`transition hover:bg-slate-50/60 ${selected.includes(transaction.id) ? 'bg-indigo-50/40' : ''}`}
                                >
                                    {can('transactions.delete') && <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(transaction.id)} onChange={() => toggleSelected(transaction.id)} disabled={!transaction.can_be_voided || transaction.status !== 'completed'} aria-label={`Pilih transaksi ${transaction.invoice_number}`} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-25" /></td>}
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {transaction.invoice_number}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {formatDateTime(transaction.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {transaction.user?.name ?? '-'}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {formatRupiah(transaction.total)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {paymentLabels[
                                            transaction.payment_method
                                        ] ?? transaction.payment_method}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            status={transaction.status}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDetailTransaction(
                                                        transaction,
                                                    )
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-rr-eye" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openReceiptFrom(transaction)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-rr-print" />
                                            </button>
                                            {transaction.status === 'completed' &&
                                                can('transactions.delete') && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        requestVoid(transaction)
                                                    }
                                                    disabled={!transaction.can_be_voided}
                                                    title={
                                                        transaction.can_be_voided
                                                            ? 'Batalkan transaksi'
                                                            : 'Batas pembatalan 1x24 jam telah lewat'
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition enabled:hover:bg-rose-50 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                                                >
                                                    <i className="fi fi-rr-cross-circle" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {transactions.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={can('transactions.delete') ? 8 : 7}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-receipt text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada transaksi
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {transactions.data.map((transaction) => (
                        <div key={transaction.id} className={`p-4 ${selected.includes(transaction.id) ? 'bg-indigo-50/40' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    {can('transactions.delete') && <input type="checkbox" checked={selected.includes(transaction.id)} onChange={() => toggleSelected(transaction.id)} disabled={!transaction.can_be_voided || transaction.status !== 'completed'} aria-label={`Pilih transaksi ${transaction.invoice_number}`} className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-25" />}
                                    <div>
                                    <p className="font-medium text-slate-800">
                                        {transaction.invoice_number}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {formatDateTime(
                                            transaction.created_at,
                                        )}
                                    </p>
                                    </div>
                                </div>
                                <StatusBadge status={transaction.status} />
                            </div>

                            <dl className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Kasir</dt>
                                    <dd className="text-right text-slate-600">
                                        {transaction.user?.name ?? '-'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Total</dt>
                                    <dd className="text-right font-semibold text-slate-800">
                                        {formatRupiah(transaction.total)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Metode</dt>
                                    <dd className="text-right text-slate-600">
                                        {paymentLabels[
                                            transaction.payment_method
                                        ] ?? transaction.payment_method}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-3 flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDetailTransaction(transaction)
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-rr-eye" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openReceiptFrom(transaction)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-rr-print" />
                                </button>
                                {transaction.status === 'completed' &&
                                    can('transactions.delete') && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            requestVoid(transaction)
                                        }
                                        disabled={!transaction.can_be_voided}
                                        title={
                                            transaction.can_be_voided
                                                ? 'Batalkan transaksi'
                                                : 'Batas pembatalan 1x24 jam telah lewat'
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition enabled:hover:bg-rose-50 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                        <i className="fi fi-rr-cross-circle" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {transactions.data.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-receipt text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada transaksi
                            </p>
                        </div>
                    )}
                </div>

                {transactions.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
                        <p className="text-sm text-slate-500">
                            Menampilkan {transactions.from}-{transactions.to}{' '}
                            dari {transactions.total} transaksi
                        </p>
                        <Pagination links={transactions.links} />
                    </div>
                )}
            </div>

            <TransactionDetailModal
                show={Boolean(detailTransaction)}
                onClose={() => setDetailTransaction(null)}
                transaction={detailTransaction}
                onPrint={openReceiptFrom}
            />

            <PasswordConfirmDialog
                show={Boolean(voidTarget)}
                onClose={cancelVoid}
                onConfirm={confirmVoid}
                processing={voiding}
                errors={voidErrors}
                title={voidTarget?.count > 1 ? 'Batalkan transaksi terpilih' : 'Batalkan transaksi'}
                message={voidTarget?.invoice ? `Transaksi ${voidTarget.invoice} akan dibatalkan dan stoknya dikembalikan.` : 'Seluruh transaksi terpilih akan dibatalkan dan stoknya dikembalikan secara bersamaan.'}
                count={voidTarget?.count ?? 1}
                totalLabel={formatRupiah(voidTarget?.total)}
                actionLabel="Konfirmasi pembatalan"
                reasonLabel="Alasan pembatalan"
                reasonPlaceholder="Contoh: salah input kasir atau pesanan dibatalkan…"
                icon="fi-rr-cross-circle"
            />
        </AdminLayout>
    );
}
