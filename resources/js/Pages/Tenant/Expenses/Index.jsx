import Breadcrumb from '@/Components/Breadcrumb';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Pagination from '@/Components/Pagination';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import usePermission from '@/Hooks/usePermission';
import ExpenseFormModal from '@/Pages/Tenant/Expenses/ExpenseFormModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const categoryStyles = {
    'Belanja Bahan': 'bg-amber-50 text-amber-700',
    Operasional: 'bg-blue-50 text-blue-700',
    Transportasi: 'bg-cyan-50 text-cyan-700',
    'Gaji Karyawan': 'bg-emerald-50 text-emerald-700',
    'Lain-lain': 'bg-indigo-50 text-indigo-700',
};

function CategoryBadge({ category }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyles[category] ?? categoryStyles['Lain-lain']}`}
        >
            {category}
        </span>
    );
}

export default function Index({
    expenses,
    filters,
    categories,
    monthlyTotal,
}) {
    const toast = useToast();
    const can = usePermission();
    const [search, setSearch] = useState(filters.search ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('tenant.expenses.index'),
                search ? { search } : {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['expenses', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const openCreateModal = () => {
        setEditingExpense(null);
        setModalOpen(true);
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setModalOpen(true);
    };

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['expenses', 'monthlyTotal'],
            onFinish: () => setRefreshing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('tenant.expenses.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () =>
                toast.error('Gagal menghapus pengeluaran. Silakan coba lagi.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AdminLayout header="Pengeluaran">
            <Head title="Pengeluaran" />

            <Breadcrumb
                items={[{ label: 'Transaksi' }, { label: 'Pengeluaran' }]}
            />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Pengeluaran
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Total bulan ini:{' '}
                        <span className="font-semibold text-slate-700">
                            {monthlyTotal}
                        </span>
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={refresh}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i
                            className={`fi fi-rr-refresh ${refreshing ? 'animate-spin' : ''}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {can('expenses.create') && (
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:flex-none"
                        >
                            <i className="fi fi-rr-add" />
                            Tambah Pengeluaran
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="border-b border-slate-100 p-4 sm:p-6">
                    <div className="relative w-full sm:max-w-md">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-search" />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari kategori atau keterangan..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5">Tanggal</th>
                                <th className="px-6 py-3.5">Kategori</th>
                                <th className="px-6 py-3.5">Nominal</th>
                                <th className="px-6 py-3.5">Keterangan</th>
                                <th className="px-6 py-3.5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.data.map((expense) => (
                                <tr
                                    key={expense.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                                        {expense.formatted_date}
                                    </td>
                                    <td className="px-6 py-4">
                                        <CategoryBadge
                                            category={expense.category}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-800">
                                        {expense.formatted_amount}
                                    </td>
                                    <td className="max-w-sm px-6 py-4 text-slate-500">
                                        <p className="truncate">
                                            {expense.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <ExpenseActions
                                            expense={expense}
                                            onEdit={openEditModal}
                                            onDelete={setDeleteTarget}
                                            can={can}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {expenses.data.length === 0 && <EmptyState />}
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {expenses.data.map((expense) => (
                        <article key={expense.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CategoryBadge
                                        category={expense.category}
                                    />
                                    <p className="mt-2 text-lg font-bold text-slate-900">
                                        {expense.formatted_amount}
                                    </p>
                                </div>
                                <ExpenseActions
                                    expense={expense}
                                    onEdit={openEditModal}
                                    onDelete={setDeleteTarget}
                                    can={can}
                                />
                            </div>
                            <p className="mt-3 text-sm text-slate-600">
                                {expense.description}
                            </p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                                <i className="fi fi-rr-calendar" />
                                {expense.formatted_date}
                            </p>
                        </article>
                    ))}
                    {expenses.data.length === 0 && <EmptyState />}
                </div>

                {expenses.links.length > 3 && (
                    <div className="flex justify-center border-t border-slate-100 px-4 py-4 sm:justify-end sm:px-6">
                        <Pagination links={expenses.links} />
                    </div>
                )}
            </div>

            <ExpenseFormModal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                expense={editingExpense}
                categories={categories}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={() => !deleting && setDeleteTarget(null)}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Pengeluaran"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus pengeluaran ${deleteTarget.formatted_amount} untuk "${deleteTarget.description}"? Bukti yang tersimpan juga akan dihapus.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}

function ExpenseActions({ expense, onEdit, onDelete, can }) {
    return (
        <div className="flex items-center justify-end gap-1">
            <a
                href={expense.receipt_url}
                target="_blank"
                rel="noreferrer"
                title="Lihat bukti"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
                <i className="fi fi-rr-picture" />
            </a>
            {can('expenses.edit') && (
                <button
                    type="button"
                    title="Edit pengeluaran"
                    onClick={() => onEdit(expense)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                >
                    <i className="fi fi-rr-pencil" />
                </button>
            )}
            {can('expenses.delete') && (
                <button
                    type="button"
                    title="Hapus pengeluaran"
                    onClick={() => onDelete(expense)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                    <i className="fi fi-rr-trash" />
                </button>
            )}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <i className="fi fi-rr-receipt text-xl" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">
                Belum ada pengeluaran
            </p>
            <p className="mt-1 text-sm text-slate-400">
                Tambahkan biaya operasional pertama Anda.
            </p>
        </div>
    );
}
