import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, useForm } from '@inertiajs/react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
export default function Index({ payments, settings }) {
    const qrisForm = useForm({
        qris_enabled: Boolean(settings?.qris_enabled),
        qris_merchant_name: settings?.qris_merchant_name ?? '',
        qris_image: null,
        remove_qris: false,
    });
    const saveQris = (event) => {
        event.preventDefault();
        qrisForm.post(route('admin.billing.settings.update'), {
            forceFormData: true,
        });
    };
    const approve = (payment) =>
        confirm(`Setujui pembayaran ${payment.tenant.name}?`) &&
        router.patch(route('admin.billing.approve', payment.id));
    const reject = (payment) => {
        const reason = prompt('Alasan penolakan:');
        if (reason)
            router.patch(route('admin.billing.reject', payment.id), { reason });
    };
    return (
        <AdminLayout header="Billing Tenant">
            <Head title="Billing Tenant" />
            <Breadcrumb items={[{ label: 'SaaS' }, { label: 'Billing Tenant' }]} homeHref={route('admin.dashboard')} />
            <form
                onSubmit={saveQris}
                className="mb-6 grid gap-5 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 lg:grid-cols-[1fr_auto]"
            >
                <div>
                    <h2 className="font-bold text-slate-900">
                        QRIS Pembayaran
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Gambar QRIS statis akan ditampilkan pada invoice tenant.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                            value={qrisForm.data.qris_merchant_name}
                            onChange={(e) =>
                                qrisForm.setData(
                                    'qris_merchant_name',
                                    e.target.value,
                                )
                            }
                            placeholder="Nama merchant QRIS"
                            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        />
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) =>
                                qrisForm.setData(
                                    'qris_image',
                                    e.target.files[0],
                                )
                            }
                            className="rounded-xl border border-dashed border-slate-300 p-2 text-sm"
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={qrisForm.data.qris_enabled}
                                onChange={(e) =>
                                    qrisForm.setData(
                                        'qris_enabled',
                                        e.target.checked,
                                    )
                                }
                            />{' '}
                            Aktifkan QRIS
                        </label>
                        {settings?.qris_image_url && (
                            <label className="flex items-center gap-2 text-sm text-rose-600">
                                <input
                                    type="checkbox"
                                    checked={qrisForm.data.remove_qris}
                                    onChange={(e) =>
                                        qrisForm.setData(
                                            'remove_qris',
                                            e.target.checked,
                                        )
                                    }
                                />{' '}
                                Hapus gambar lama
                            </label>
                        )}
                    </div>
                    {qrisForm.errors.qris_image && (
                        <p className="mt-2 text-sm text-red-600">
                            {qrisForm.errors.qris_image}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {settings?.qris_image_url && (
                        <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                            <img
                                src={settings.qris_image_url}
                                alt="QRIS aktif"
                                className="h-28 w-28 object-contain"
                            />
                        </div>
                    )}
                    <button
                        disabled={qrisForm.processing}
                        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                    >
                        Simpan QRIS
                    </button>
                </div>
            </form>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                    Verifikasi Pembayaran
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Periksa bukti transfer sebelum memperpanjang langganan.
                </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                {payments.data.map((payment) => (
                    <div
                        key={payment.id}
                        className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-0 lg:flex-row lg:items-center"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900">
                                {payment.tenant.name}
                            </p>
                            <p className="text-sm text-slate-500">
                                {payment.invoice.number} ·{' '}
                                {payment.tenant.email}
                            </p>
                            {payment.invoice.items?.length > 0 && <p className="mt-1 text-xs text-slate-400">{payment.invoice.items.map((item) => item.description).join(' · ')}</p>}
                        </div>
                        <p className="font-bold text-slate-900">
                            {money(payment.amount)}
                        </p>
                        <span className="text-xs font-semibold uppercase text-slate-500">
                            {payment.payment_method === 'qris'
                                ? 'QRIS'
                                : 'Transfer'}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-700">
                            {payment.status}
                        </span>
                        <a
                            href={payment.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                        >
                            Lihat Bukti
                        </a>
                        {payment.status === 'pending' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => reject(payment)}
                                    className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600"
                                >
                                    Tolak
                                </button>
                                <button
                                    onClick={() => approve(payment)}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                                >
                                    Setujui
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {payments.data.length === 0 && (
                    <p className="p-10 text-center text-sm text-slate-400">
                        Belum ada pembayaran.
                    </p>
                )}
            </div>
            {payments.links && (
                <div className="mt-5">
                    <Pagination links={payments.links} />
                </div>
            )}
        </AdminLayout>
    );
}
