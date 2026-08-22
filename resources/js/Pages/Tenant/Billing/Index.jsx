import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const date = (value) =>
    value
        ? new Date(value).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : '-';

export default function Index({ subscription, billing, paymentSettings, networkRelationship, paymentCentralized = false }) {
    const isOwner = usePage().props.auth.user.role === 'owner';
    const qrisAvailable = Boolean(
        paymentSettings?.qris_enabled && paymentSettings?.qris_image_url,
    );
    const invoice =
        subscription.invoices.find((item) =>
            ['open', 'rejected'].includes(item.status),
        ) ?? subscription.invoices.find((item) => item.status === 'pending');
    const form = useForm({
        payment_method: qrisAvailable ? 'qris' : 'bank_transfer',
        proof: null,
        note: '',
    });
    const activeUntil = subscription.is_grandfathered
        ? 'Tanpa batas'
        : date(
              subscription.status === 'trialing'
                  ? subscription.trial_ends_at
                  : subscription.current_period_end,
          );
    const submit = (e) => {
        e.preventDefault();
        form.post(route('tenant.billing.submit', invoice.id), {
            forceFormData: true,
        });
    };
    return (
        <AdminLayout header="Billing">
            <Head title="Billing" />
            <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Billing' }]} />
            <div className="max-w-5xl">
                <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white shadow-lg">
                    <p className="text-sm font-semibold text-indigo-100">
                        {subscription.plan_name}
                    </p>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold">
                                {money(subscription.price)}
                                <span className="text-base font-medium text-indigo-200">
                                    {' '}
                                    / bulan
                                </span>
                            </h2>
                            <p className="mt-2 text-sm text-indigo-100">
                                Akses aktif sampai: {activeUntil}
                            </p>
                        </div>
                        <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold uppercase">
                            {subscription.is_grandfathered
                                ? 'Grandfathered'
                                : subscription.status}
                        </span>
                    </div>
                </div>
                {paymentCentralized && networkRelationship && (
                    <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
                        <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><i className="fi fi-rr-chart-network" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Billing terpusat</p><h3 className="mt-1 text-lg font-extrabold text-indigo-950">Dibayar oleh {networkRelationship.parent_tenant.name}</h3><p className="mt-2 text-sm leading-6 text-indigo-700">Cabang tidak perlu mengirim pembayaran terpisah. Akses mengikuti subscription jaringan dan invoice gabungan tenant pusat.</p></div></div>
                    </section>
                )}
                {invoice && !paymentCentralized && (
                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                            <h3 className="font-bold text-slate-900">
                                Invoice {invoice.number}
                            </h3>
                            <p className="mt-2 text-3xl font-extrabold text-slate-900">
                                {money(invoice.amount)}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Jatuh tempo {date(invoice.due_at)}
                            </p>
                            {invoice.items?.length > 0 && <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">{invoice.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-semibold text-slate-700">{item.description}</p><p className="text-xs text-slate-400">{item.quantity} × {money(item.unit_amount)}</p></div><p className="font-bold text-slate-900">{money(item.total_amount)}</p></div>)}</div>}
                            {form.data.payment_method === 'qris' &&
                            qrisAvailable ? (
                                <div className="mt-5 text-center">
                                    <div className="inline-block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                                        <img
                                            src={paymentSettings.qris_image_url}
                                            alt={`QRIS ${paymentSettings.qris_merchant_name ?? ''}`}
                                            className="h-56 w-56 object-contain"
                                        />
                                    </div>
                                    <p className="mt-3 text-sm font-bold text-slate-900">
                                        {paymentSettings.qris_merchant_name ||
                                            'Pembayaran QRIS'}
                                    </p>
                                    <a
                                        href={paymentSettings.qris_image_url}
                                        download
                                        className="mt-2 inline-flex text-sm font-semibold text-indigo-600"
                                    >
                                        Unduh gambar QRIS
                                    </a>
                                </div>
                            ) : (
                                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                                    <p className="font-bold text-slate-900">
                                        Transfer ke {billing.bank_name}
                                    </p>
                                    <p className="mt-1 text-lg font-bold tracking-wide">
                                        {billing.bank_account}
                                    </p>
                                    <p>a.n. {billing.bank_holder}</p>
                                </div>
                            )}
                        </section>
                        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                            <h3 className="font-bold text-slate-900">
                                Konfirmasi pembayaran
                            </h3>
                            {invoice.status === 'pending' ? (
                                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                                    Bukti pembayaran sedang diverifikasi
                                    superadmin.
                                </div>
                            ) : isOwner ? (
                                <form
                                    onSubmit={submit}
                                    className="mt-5 space-y-4"
                                >
                                    <div
                                        className={`grid gap-2 ${qrisAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}
                                    >
                                        {qrisAvailable && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    form.setData(
                                                        'payment_method',
                                                        'qris',
                                                    )
                                                }
                                                className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${form.data.payment_method === 'qris' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                                            >
                                                QRIS
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                form.setData(
                                                    'payment_method',
                                                    'bank_transfer',
                                                )
                                            }
                                            className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${form.data.payment_method === 'bank_transfer' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            Transfer Bank
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        onChange={(e) =>
                                            form.setData(
                                                'proof',
                                                e.target.files[0],
                                            )
                                        }
                                        className="w-full rounded-xl border border-dashed border-slate-300 p-4 text-sm"
                                    />
                                    <textarea
                                        value={form.data.note}
                                        onChange={(e) =>
                                            form.setData('note', e.target.value)
                                        }
                                        placeholder="Catatan pembayaran (opsional)"
                                        className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    />
                                    {form.errors.proof && (
                                        <p className="text-sm text-red-600">
                                            {form.errors.proof}
                                        </p>
                                    )}
                                    <button
                                        disabled={form.processing}
                                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                                    >
                                        Kirim Bukti Pembayaran
                                    </button>
                                </form>
                            ) : (
                                <p className="mt-4 text-sm text-slate-500">
                                    Hubungi owner toko untuk memperbarui
                                    langganan.
                                </p>
                            )}
                        </section>
                    </div>
                )}
                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                    <div className="border-b border-slate-100 p-5">
                        <h3 className="font-bold text-slate-900">
                            Riwayat invoice
                        </h3>
                    </div>
                    {subscription.invoices.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-0"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {item.number}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {date(item.created_at)}
                                </p>
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                                {money(item.amount)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                                {item.status}
                            </span>
                        </div>
                    ))}
                    {subscription.invoices.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada invoice untuk tenant ini.</p>}
                </section>
            </div>
        </AdminLayout>
    );
}
