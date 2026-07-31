import ConfirmDialog from '@/Components/ConfirmDialog';
import Pagination from '@/Components/Pagination';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import EmployeeFormModal from '@/Pages/Tenant/Employees/EmployeeFormModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const formatDate = (value) =>
    new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

export default function Index({ employees, filters }) {
    const toast = useToast();

    const [search, setSearch] = useState(filters.search ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
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
                route('tenant.employees.index'),
                {
                    ...(search ? { search } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['employees', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const openCreateModal = () => {
        setEditingEmployee(null);
        setModalOpen(true);
    };

    const openEditModal = (employee) => {
        setEditingEmployee(employee);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['employees'],
            onFinish: () => setRefreshing(false),
        });
    };

    const requestDelete = (employee) => setDeleteTarget(employee);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('tenant.employees.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () => toast.error('Gagal menghapus karyawan. Silakan coba lagi.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AdminLayout header="Karyawan">
            <Head title="Karyawan" />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Manajemen Karyawan
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola akun login karyawan pada tenant Anda.
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
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <i className="fi fi-rr-add" />
                        Tambah Karyawan
                    </button>
                </div>
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
                            placeholder="Cari nama atau username..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Karyawan
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Username
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Bergabung
                                </th>
                                <th className="px-6 py-3.5 text-right font-semibold">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.data.map((employee) => (
                                <tr
                                    key={employee.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                                                {employee.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                            <span className="font-medium text-slate-800">
                                                {employee.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        @{employee.username}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                                        {formatDate(employee.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditModal(employee)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-rr-pencil" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    requestDelete(employee)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <i className="fi fi-rr-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {employees.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-users text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada karyawan
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Tambahkan karyawan baru untuk
                                            memberikan akses login.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {employees.data.map((employee) => (
                        <div key={employee.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                                        {employee.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">
                                            {employee.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            @{employee.username}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <dl className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Bergabung
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatDate(employee.created_at)}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-3 flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(employee)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-rr-pencil" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDelete(employee)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <i className="fi fi-rr-trash" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {employees.data.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-users text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada karyawan
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Tambahkan karyawan baru untuk memberikan akses
                                login.
                            </p>
                        </div>
                    )}
                </div>

                {employees.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
                        <p className="text-sm text-slate-500">
                            Menampilkan {employees.from}-{employees.to} dari{' '}
                            {employees.total} karyawan
                        </p>
                        <Pagination links={employees.links} />
                    </div>
                )}
            </div>

            <EmployeeFormModal
                show={modalOpen}
                onClose={closeModal}
                employee={editingEmployee}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Karyawan"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus karyawan "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}
