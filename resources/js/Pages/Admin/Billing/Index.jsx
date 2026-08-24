import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, useForm } from '@inertiajs/react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
export default function Index({ payments, settings }) {
    const bankForm = useForm({
        bank_name: settings?.bank_name ?? '',
        bank_account: settings?.bank_account ?? '',
        bank_holder: settings?.bank_holder ?? '',
    });
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
    const saveBank = (event) => {
        event.preventDefault();
        bankForm.patch(route('admin.billing.bank-settings.update'), {
            preserveScroll: true,
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
                onSubmit={saveBank}
                className="mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40"
            >
                <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <i className="fi fi-rr-bank" />
                            </span>
                            <div>
                                <h2 className="font-bold text-slate-900">Rekening Pembayaran</h2>
                                <p className="mt-1 text-sm text-slate-500">Rekening ini ditampilkan kepada tenant saat memilih transfer bank.</p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nama Bank</span>
                                <input
                                    value={bankForm.data.bank_name}
                                    onChange={(event) => bankForm.setData('bank_name', event.target.value)}
                                    placeholder="Contoh: Bank BCA"
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                />
                                {bankForm.errors.bank_name && <span className="mt-1.5 block text-xs text-rose-600">{bankForm.errors.bank_name}</span>}
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nomor Rekening</span>
                                <input
                                    value={bankForm.data.bank_account}
                                    onChange={(event) => bankForm.setData('bank_account', event.target.value)}
                                    inputMode="numeric"
                                    placeholder="Contoh: 1234567890"
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm tracking-wide text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                />
                                {bankForm.errors.bank_account && <span className="mt-1.5 block text-xs text-rose-600">{bankForm.errors.bank_account}</span>}
                            </label>
                            <label className="block sm:col-span-2">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nama Pemilik Rekening</span>
                                <input
                                    value={bankForm.data.bank_holder}
                                    onChange={(event) => bankForm.setData('bank_holder', event.target.value)}
                                    placeholder="Contoh: PT Rancaka Digital Indonesia"
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                />
                                {bankForm.errors.bank_holder && <span className="mt-1.5 block text-xs text-rose-600">{bankForm.errors.bank_holder}</span>}
                            </label>
                        </div>

                        <button
                            disabled={bankForm.processing}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <i className={`fi ${bankForm.processing ? 'fi-rr-spinner animate-spin' : 'fi-rr-disk'}`} />
                            Simpan Rekening
                        </button>
                    </div>

                    <div className="relative flex min-h-56 items-center overflow-hidden bg-slate-950 p-6 text-white">
                        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-emerald-400/10" />
                        <div className="absolute -bottom-16 left-16 h-40 w-40 rounded-full bg-emerald-400/5" />
                        <div className="relative w-full">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Rekening Aktif</span>
                                <i className="fi fi-rr-credit-card text-xl text-white/40" />
                            </div>
                            <p className="mt-7 text-sm font-semibold text-white/70">{bankForm.data.bank_name || 'Nama bank'}</p>
                            <p className="mt-1 break-all font-mono text-2xl font-bold tracking-[0.08em]">{bankForm.data.bank_account || '0000000000'}</p>
                            <p className="mt-5 text-xs uppercase tracking-[0.12em] text-white/50">a.n. {bankForm.data.bank_holder || 'Nama pemilik rekening'}</p>
                        </div>
                    </div>
                </div>
            </form>
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
