import Breadcrumb from '@/Components/Breadcrumb';
import MoneyInput from '@/Components/MoneyInput';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const datetime = (value) => new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function Show({ creditSale }) {
    const { flash } = usePage().props;
    const remaining = creditSale.total_amount - creditSale.paid_amount;
    const form = useForm({ amount: remaining, note: '' });
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(
        Boolean(flash?.receipt_url),
    );

    useEffect(() => {
        if (flash?.receipt_url) setShowPaymentSuccess(true);
    }, [flash?.receipt_url]);

    const submit = (event) => {
        event.preventDefault();
        form.post(route('tenant.credit-sales.pay', creditSale.id), {
            preserveScroll: true,
            onSuccess: () => form.reset('note'),
        });
    };

    return (
        <AdminLayout header="Detail Penjualan Kredit">
            <Head title={`Hutang ${creditSale.customer.name}`} />
            <Breadcrumb items={[
                { label: 'Penjualan Kredit', href: route('tenant.credit-sales.index') },
                { label: creditSale.transaction.invoice_number },
            ]} />

            <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                    <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                        <div className="flex min-w-0 items-center gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-600"><i className="fi fi-rr-file-invoice-dollar" /></span>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-600">{creditSale.transaction.invoice_number}</p>
                                <h2 className="mt-1 truncate text-xl font-bold text-slate-900">{creditSale.customer.name}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                    <span className="flex items-center gap-1.5"><i className="fi fi-rr-calendar text-xs" />{datetime(creditSale.transaction.created_at)}</span>
                                    <span className="flex items-center gap-1.5"><i className="fi fi-rr-user text-xs" />{creditSale.transaction.user.name}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${creditSale.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${creditSale.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{creditSale.status === 'paid' ? 'LUNAS' : 'OUTSTANDING'}</span>
                            <div className="sm:mt-2"><p className="text-xs text-slate-500">Sisa hutang</p><p className="text-xl font-bold text-slate-900">{rupiah(remaining)}</p></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/60 sm:w-fit sm:min-w-80">
                        <div className="px-5 py-3"><p className="text-[11px] text-slate-400">Total transaksi</p><p className="mt-0.5 text-sm font-semibold text-slate-700">{rupiah(creditSale.total_amount)}</p></div>
                        <div className="border-l border-slate-100 px-5 py-3"><p className="text-[11px] text-slate-400">Sudah dibayar</p><p className="mt-0.5 text-sm font-semibold text-emerald-600">{rupiah(creditSale.paid_amount)}</p></div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><i className="fi fi-rr-shopping-bag text-sm" /></span><h3 className="font-bold text-slate-900">Barang yang dibeli</h3></div>
                            <div className="mt-4 divide-y divide-slate-100">{creditSale.transaction.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-3.5"><div><p className="font-medium text-slate-800">{item.product_name}</p><p className="mt-0.5 text-xs text-slate-400">{item.quantity} × {rupiah(item.unit_price)}{item.note ? ` · ${item.note}` : ''}</p></div><p className="shrink-0 font-semibold text-slate-800">{rupiah(item.subtotal)}</p></div>)}</div>
                            <div className="mt-2 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-900"><span>Total transaksi</span><span>{rupiah(creditSale.total_amount)}</span></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><i className="fi fi-rr-time-past text-sm" /></span><h3 className="font-bold text-slate-900">Riwayat pembayaran</h3></div>
                            <div className="mt-4 divide-y divide-slate-100">{creditSale.payments.length ? creditSale.payments.map((payment) => <div key={payment.id} className="flex items-start justify-between gap-4 py-3.5"><div><p className="text-sm font-medium text-slate-800">{datetime(payment.created_at)}</p><p className="mt-0.5 text-xs text-slate-400">{payment.user.name}{payment.note ? ` · ${payment.note}` : ''}</p></div><span className="shrink-0 font-semibold text-emerald-600">+{rupiah(payment.amount)}</span></div>) : <p className="py-6 text-center text-sm text-slate-400">Belum ada pembayaran.</p>}</div>
                        </section>
                    </div>

                    <aside>
                        {creditSale.status !== 'paid' ? (
                            <form onSubmit={submit} className="sticky top-24 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm shadow-amber-100/50">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                        <i className="fi fi-rr-hand-holding-usd" />
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-amber-950">Bayar hutang</h3>
                                        <p className="text-xs text-amber-700">Catat cicilan atau pelunasan.</p>
                                    </div>
                                </div>
                                <label className="mt-5 block text-xs font-bold text-amber-900">Nominal pembayaran</label>
                                <div className="relative mt-1.5">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-slate-500">Rp</span>
                                    <MoneyInput
                                        min="1"
                                        max={remaining}
                                        value={form.data.amount}
                                        onValueChange={(value) => form.setData('amount', value)}
                                        className="w-full rounded-xl border border-amber-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                    />
                                </div>
                                <button type="button" onClick={() => form.setData('amount', remaining)} className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900">
                                    Isi pelunasan penuh
                                </button>
                                {form.errors.amount && <p className="mt-1 text-xs text-red-600">{form.errors.amount}</p>}
                                <label className="mt-4 block text-xs font-bold text-amber-900">Catatan</label>
                                <textarea rows="3" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} placeholder="Opsional" className="mt-1.5 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" />
                                <button disabled={form.processing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60">
                                    <i className="fi fi-rr-check" />
                                    Catat Pembayaran
                                </button>
                            </form>
                        ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">
                                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><i className="fi fi-rr-check" /></span>
                                <p className="mt-3 font-bold">Hutang sudah lunas</p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            <Modal
                show={showPaymentSuccess}
                onClose={() => setShowPaymentSuccess(false)}
                maxWidth="sm"
            >
                <Modal.Body>
                    <div className="py-3 text-center">
                        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600 ring-8 ring-emerald-50/60">
                            <i className="fi fi-rr-check" />
                        </span>
                        <h2 className="mt-6 text-xl font-bold text-slate-900">
                            Pembayaran Berhasil
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                            Pembayaran hutang telah dicatat dan nota bukti
                            pembayaran sudah tersedia.
                        </p>

                        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 text-left">
                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <span className="text-slate-500">
                                    Pembayaran
                                </span>
                                <span className="font-bold text-emerald-600">
                                    {rupiah(flash?.credit_payment_amount)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 text-sm">
                                <span className="text-slate-500">
                                    Sisa hutang
                                </span>
                                <span className="font-bold text-slate-900">
                                    {rupiah(flash?.credit_payment_remaining)}
                                </span>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        onClick={() => setShowPaymentSuccess(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Tutup
                    </button>
                    <a
                        href={flash?.receipt_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setShowPaymentSuccess(false)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700"
                    >
                        <i className="fi fi-rr-receipt" />
                        Buka Nota
                    </a>
                </Modal.Footer>
            </Modal>
        </AdminLayout>
    );
}
