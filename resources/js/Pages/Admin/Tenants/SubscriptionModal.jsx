import Modal from '@/Components/Modal';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function SubscriptionModal({ show, onClose, tenant }) {
    const toast = useToast();
    const { data, setData, patch, processing, errors, reset, clearErrors } = useForm({
        action: 'trial',
        trial_days: 7,
        package_months: 1,
    });

    useEffect(() => {
        if (!show) return;
        reset();
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, tenant]);

    const submit = (event) => {
        event.preventDefault();
        if (!tenant) return;

        patch(route('admin.tenants.subscription.update', tenant.id), {
            preserveScroll: true,
            onSuccess: onClose,
            onError: () => toast.error('Gagal memperbarui langganan. Periksa kembali durasinya.'),
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Atur Langganan</h2>
                        <p className="mt-1 text-sm text-slate-500">{tenant?.name}</p>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setData('action', 'trial')}
                            className={`rounded-xl border p-4 text-left transition ${data.action === 'trial' ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <i className="fi fi-rr-time-forward text-lg text-sky-600" />
                            <p className="mt-2 text-sm font-bold text-slate-900">Tambah Trial</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">Tambahkan masa akses trial untuk tenant.</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setData('action', 'package')}
                            className={`rounded-xl border p-4 text-left transition ${data.action === 'package' ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <i className="fi fi-rr-box-open text-lg text-indigo-600" />
                            <p className="mt-2 text-sm font-bold text-slate-900">Set ke Paket</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">Aktifkan paket bulanan tanpa menunggu pembayaran.</p>
                        </button>
                    </div>

                    <div className="mt-5">
                        {data.action === 'trial' ? (
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">Tambahan durasi trial (hari)</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={data.trial_days}
                                    onChange={(event) => setData('trial_days', event.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                />
                                {errors.trial_days && <p className="mt-1.5 text-sm text-rose-600">{errors.trial_days}</p>}
                            </label>
                        ) : (
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">Durasi paket bulanan</span>
                                <select
                                    value={data.package_months}
                                    onChange={(event) => setData('package_months', event.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    {[1, 3, 6, 12].map((months) => <option key={months} value={months}>{months} bulan</option>)}
                                </select>
                                {errors.package_months && <p className="mt-1.5 text-sm text-rose-600">{errors.package_months}</p>}
                            </label>
                        )}
                        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            Jika tenant masih memiliki masa aktif, durasi baru akan ditambahkan setelah tanggal berakhir saat ini.
                        </p>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <button type="button" onClick={onClose} disabled={processing} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Batal</button>
                    <button disabled={processing} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {processing ? 'Menyimpan...' : data.action === 'trial' ? 'Tambahkan Trial' : 'Aktifkan Paket'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
