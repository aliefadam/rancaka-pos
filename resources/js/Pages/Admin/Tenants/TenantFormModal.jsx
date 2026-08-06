import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    owner_username: '',
    owner_password: '',
};

const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
];

export default function TenantFormModal({ show, onClose, tenant }) {
    const isEdit = Boolean(tenant);
    const toast = useToast();

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    useEffect(() => {
        if (!show) return;

        setData(
            tenant
                ? {
                      name: tenant.name,
                      email: tenant.email,
                      phone: tenant.phone ?? '',
                      address: tenant.address ?? '',
                      status: tenant.status,
                      owner_username: '',
                      owner_password: '',
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, tenant]);

    const submit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('admin.tenants.update', tenant.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(
                        'Gagal memperbarui tenant. Periksa kembali data yang dimasukkan.',
                    ),
            });
        } else {
            post(route('admin.tenants.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        'Gagal menambahkan tenant. Periksa kembali data yang dimasukkan.',
                    ),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Tenant' : 'Tambah Tenant'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Nama Tenant
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="cth. Toko Maju Jaya"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="tenant@contoh.com"
                            />
                            {errors.email && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="phone"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Telepon
                            </label>
                            <input
                                id="phone"
                                type="text"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="08xxxxxxxxxx"
                            />
                            {errors.phone && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.phone}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="address"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Alamat
                            </label>
                            <textarea
                                id="address"
                                rows={3}
                                value={data.address}
                                onChange={(e) =>
                                    setData('address', e.target.value)
                                }
                                className="block w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="Alamat lengkap tenant"
                            />
                            {errors.address && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.address}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Status
                            </label>
                            <Select
                                value={data.status}
                                onChange={(value) =>
                                    setData('status', value)
                                }
                                options={statusOptions}
                                placeholder="Pilih status"
                            />
                            {errors.status && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.status}
                                </p>
                            )}
                        </div>

                        {!isEdit && (
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Akun Login Owner
                                </p>

                                <div>
                                    <label
                                        htmlFor="owner_username"
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                    >
                                        Username Owner
                                    </label>
                                    <input
                                        id="owner_username"
                                        type="text"
                                        value={data.owner_username}
                                        onChange={(e) =>
                                            setData(
                                                'owner_username',
                                                e.target.value,
                                            )
                                        }
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="cth. owner.tokomaju"
                                    />
                                    {errors.owner_username && (
                                        <p className="mt-1.5 text-sm text-red-600">
                                            {errors.owner_username}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="owner_password"
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                    >
                                        Password Owner
                                    </label>
                                    <input
                                        id="owner_password"
                                        type="password"
                                        value={data.owner_password}
                                        onChange={(e) =>
                                            setData(
                                                'owner_password',
                                                e.target.value,
                                            )
                                        }
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="Minimal 8 karakter"
                                    />
                                    {errors.owner_password && (
                                        <p className="mt-1.5 text-sm text-red-600">
                                            {errors.owner_password}
                                        </p>
                                    )}
                                </div>
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
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah Tenant'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
