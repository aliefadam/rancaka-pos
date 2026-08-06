import Breadcrumb from '@/Components/Breadcrumb';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import ReceiptModal from '@/Pages/Tenant/Reports/Transactions/ReceiptModal';
import TransactionDetailModal from '@/Pages/Tenant/Reports/Transactions/TransactionDetailModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'completed', label: 'Selesai' },
    { value: 'voided', label: 'Dibatalkan' },
];

const paymentLabels = {
    cash: 'Tunai',
    qris: 'QRIS',
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

export default function Index({ transactions, tenant, filters }) {
    const toast = useToast();
    const can = usePermission();

    const [search, setSearch] = useState(filters.search ?? '');
    const [date, setDate] = useState(filters.date ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [detailTransaction, setDetailTransaction] = useState(null);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const [voidTarget, setVoidTarget] = useState(null);
    const [voiding, setVoiding] = useState(false);
    const isFirstRun = useRef(true);

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
                    ...(date ? { date } : {}),
                    ...(status ? { status } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['transactions', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, date, status]);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['transactions'],
            onFinish: () => setRefreshing(false),
        });
    };

    const requestVoid = (transaction) => setVoidTarget(transaction);
    const cancelVoid = () => {
        if (voiding) return;
        setVoidTarget(null);
    };

    const confirmVoid = () => {
        if (!voidTarget) return;

        setVoiding(true);
        router.patch(
            route('tenant.reports.transactions.void', voidTarget.id),
            {},
            {
                preserveScroll: true,
                onError: (errors) =>
                    toast.error(
                        errors.transaction ??
                            'Gagal membatalkan transaksi. Silakan coba lagi.',
                    ),
                onFinish: () => {
                    setVoiding(false);
                    setVoidTarget(null);
                },
            },
        );
    };

    const openReceiptFrom = (transaction) => {
        setDetailTransaction(null);
        setReceiptTransaction(transaction);
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
                        Seluruh transaksi kasir.
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

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-48"
                    />

                    <Select
                        value={status}
                        onChange={setStatus}
                        options={statusFilterOptions}
                        placeholder="Semua Status"
                        className="w-full sm:w-48"
                    />
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                                    className="transition hover:bg-slate-50/60"
                                >
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
                                                onClick={() =>
                                                    setReceiptTransaction(
                                                        transaction,
                                                    )
                                                }
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
                                        colSpan={7}
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
                        <div key={transaction.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
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
                                    onClick={() =>
                                        setReceiptTransaction(transaction)
                                    }
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

            <ReceiptModal
                show={Boolean(receiptTransaction)}
                onClose={() => setReceiptTransaction(null)}
                transaction={receiptTransaction}
                tenant={tenant}
            />

            <ConfirmDialog
                show={Boolean(voidTarget)}
                onClose={cancelVoid}
                onConfirm={confirmVoid}
                processing={voiding}
                title="Batalkan Transaksi"
                message={
                    voidTarget &&
                    `Yakin ingin membatalkan transaksi "${voidTarget.invoice_number}" milik kasir ${voidTarget.user?.name ?? '-'}? Stok akan dikembalikan.`
                }
                confirmText="Ya, Batalkan"
                icon="fi-rr-cross-circle"
            />
        </AdminLayout>
    );
}
