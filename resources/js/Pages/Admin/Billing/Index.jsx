import AdminLayout from '@/Layouts/AdminLayout';
import Pagination from '@/Components/Pagination';
import { Head, router } from '@inertiajs/react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
export default function Index({ payments }) {
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
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                    Verifikasi Pembayaran
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Periksa bukti transfer sebelum memperpanjang langganan.
                </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                        </div>
                        <p className="font-bold text-slate-900">
                            {money(payment.amount)}
                        </p>
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
