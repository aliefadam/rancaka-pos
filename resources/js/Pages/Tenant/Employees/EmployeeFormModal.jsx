import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const emptyForm = {
    name: '',
    username: '',
    password: '',
    employee_role_id: '',
};

export default function EmployeeFormModal({ show, onClose, employee, roles = [] }) {
    const isEdit = Boolean(employee);
    const toast = useToast();

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    const roleOptions = [
        { value: '', label: 'Tanpa role (tidak ada akses menu)' },
        ...roles.map((role) => ({
            value: role.id,
            label: role.name,
        })),
    ];

    useEffect(() => {
        if (!show) return;

        setData(
            employee
                ? {
                      name: employee.name,
                      username: employee.username,
                      password: '',
                      employee_role_id: employee.employee_role_id ?? '',
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, employee]);

    const submit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('tenant.employees.update', employee.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(
                        'Gagal memperbarui karyawan. Periksa kembali data yang dimasukkan.',
                    ),
            });
        } else {
            post(route('tenant.employees.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        'Gagal menambahkan karyawan. Periksa kembali data yang dimasukkan.',
                    ),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Nama Karyawan
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="cth. Budi Santoso"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="username"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={data.username}
                                onChange={(e) =>
                                    setData('username', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="cth. budi.santoso"
                            />
                            {errors.username && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.username}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder={
                                    isEdit
                                        ? 'Kosongkan jika tidak ingin mengubah'
                                        : 'Minimal 8 karakter'
                                }
                            />
                            {errors.password && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Role
                            </label>
                            <Select
                                value={data.employee_role_id}
                                onChange={(value) =>
                                    setData('employee_role_id', value)
                                }
                                options={roleOptions}
                                placeholder="Belum ada akses khusus"
                            />
                            <p className="mt-1.5 text-xs text-slate-400">
                                Menentukan menu &amp; aksi yang bisa diakses
                                karyawan ini.
                            </p>
                            {errors.employee_role_id && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.employee_role_id}
                                </p>
                            )}
                        </div>
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
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
