import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'open', label: 'Berlangsung' },
    { value: 'closed', label: 'Selesai' },
];

function formatDateTime(value) {
    if (!value) return '-';
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

function formatDifference(value) {
    if (value === null) return '-';
    if (value === 0) return 'Rp 0';

    return `${value > 0 ? '+' : '-'}Rp ${Math.abs(value).toLocaleString('id-ID')}`;
}

function StatusBadge({ open }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                open
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
            }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {open ? 'Berlangsung' : 'Selesai'}
        </span>
    );
}

export default function Index({ shifts, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [date, setDate] = useState(filters.date ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('tenant.reports.shifts.index'),
                {
                    ...(search ? { search } : {}),
                    ...(date ? { date } : {}),
                    ...(status ? { status } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['shifts', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, date, status]);

    return (
        <AdminLayout header="Riwayat Shift">
            <Head title="Riwayat Shift" />

            <Breadcrumb items={[{ label: 'Laporan' }, { label: 'Riwayat Shift' }]} />

            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                    Riwayat Shift
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Pantau riwayat buka-tutup kas dan penjualan setiap shift.
                </p>
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
                            placeholder="Cari nama kasir..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="relative w-full sm:w-48">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-calendar" />
                        </span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            aria-label="Filter tanggal buka shift"
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <Select
                        value={status}
                        onChange={setStatus}
                        options={statusFilterOptions}
                        placeholder="Semua Status"
                        className="w-full sm:w-48"
                    />
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1520px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Dibuka Oleh
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Waktu Buka
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Waktu Tutup
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Modal Awal
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Penjualan Tunai
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Penjualan QRIS
                                </th>
                                <th className="px-6 py-3.5 font-semibold">Penjualan Online</th>
                                <th className="px-6 py-3.5 font-semibold">Penjualan Kredit</th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Modal Akhir Sistem
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Kas Aktual
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Selisih
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Total Penjualan
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Transaksi
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shifts.data.map((shift) => (
                                <tr
                                    key={shift.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {shift.user?.name ?? '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {formatDateTime(shift.opened_at)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {formatDateTime(shift.closed_at)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {formatRupiah(shift.opening_cash)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {formatRupiah(shift.cash_sales)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {formatRupiah(shift.qris_sales)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{formatRupiah(shift.online_sales)}</td>
                                    <td className="px-6 py-4 text-slate-700">{formatRupiah(shift.credit_sales)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {formatRupiah(
                                            shift.expected_closing_cash,
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {shift.closing_cash !== null
                                            ? formatRupiah(shift.closing_cash)
                                            : '-'}
                                    </td>
                                    <td
                                        className={`px-6 py-4 font-semibold ${
                                            shift.cash_difference === null ||
                                            shift.cash_difference === 0
                                                ? 'text-slate-500'
                                                : 'text-amber-600'
                                        }`}
                                    >
                                        {formatDifference(
                                            shift.cash_difference,
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {formatRupiah(shift.total_sales)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {shift.transaction_count}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            open={shift.closed_at === null}
                                        />
                                    </td>
                                </tr>
                            ))}

                            {shifts.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={14}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-time-past text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada riwayat shift
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {shifts.data.map((shift) => (
                        <div key={shift.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-medium text-slate-800">
                                        {shift.user?.name ?? '-'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {formatDateTime(shift.opened_at)}
                                    </p>
                                </div>
                                <StatusBadge open={shift.closed_at === null} />
                            </div>

                            <dl className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Waktu Tutup
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatDateTime(shift.closed_at)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Modal Awal
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatRupiah(shift.opening_cash)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Penjualan Tunai
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatRupiah(shift.cash_sales)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Penjualan QRIS
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatRupiah(shift.qris_sales)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Penjualan Online</dt>
                                    <dd className="text-right text-slate-600">{formatRupiah(shift.online_sales)}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Penjualan Kredit</dt>
                                    <dd className="text-right text-slate-600">{formatRupiah(shift.credit_sales)}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Modal Akhir Sistem
                                    </dt>
                                    <dd className="text-right font-medium text-slate-700">
                                        {formatRupiah(
                                            shift.expected_closing_cash,
                                        )}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Kas Aktual
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {shift.closing_cash !== null
                                            ? formatRupiah(shift.closing_cash)
                                            : '-'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Selisih</dt>
                                    <dd
                                        className={`text-right font-semibold ${
                                            shift.cash_difference === null ||
                                            shift.cash_difference === 0
                                                ? 'text-slate-600'
                                                : 'text-amber-600'
                                        }`}
                                    >
                                        {formatDifference(
                                            shift.cash_difference,
                                        )}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Total Penjualan
                                    </dt>
                                    <dd className="text-right font-semibold text-slate-800">
                                        {formatRupiah(shift.total_sales)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Transaksi
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {shift.transaction_count}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    ))}

                    {shifts.data.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-time-past text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada riwayat shift
                            </p>
                        </div>
                    )}
                </div>

                {shifts.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
                        <p className="text-sm text-slate-500">
                            Menampilkan {shifts.from}-{shifts.to} dari{' '}
                            {shifts.total} shift
                        </p>
                        <Pagination links={shifts.links} />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
