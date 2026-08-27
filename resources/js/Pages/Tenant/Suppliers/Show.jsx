import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const paymentMethod = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS', other: 'Lainnya' };
const purchaseStatus = { paid: 'Lunas', unpaid: 'Belum dibayar', partial: 'Sebagian', overdue: 'Terlambat', void: 'Dibatalkan' };

export default function Show({ supplier, summary, purchases, payments }) {
    const can = usePermission();
    const contactRows = [
        ['fi-rr-user', 'Kontak', supplier.contact_name || 'Belum diisi'],
        ['fi-rr-phone-call', 'Telepon', supplier.phone || 'Belum diisi'],
        ['fi-rr-envelope', 'Email', supplier.email || 'Belum diisi'],
        ['fi-rr-marker', 'Alamat', supplier.address || 'Belum diisi'],
    ];
    const cards = [
        ['Total pembelian', money(summary.purchase_total), `${summary.purchase_count} dokumen`, 'fi-rr-shopping-cart', 'text-indigo-700 bg-indigo-50'],
        ['Sudah dibayar', money(summary.paid_total), 'Pembayaran valid', 'fi-rr-check-circle', 'text-emerald-700 bg-emerald-50'],
        ['Sisa hutang', money(summary.payable_total), summary.payable_total > 0 ? 'Masih harus dibayar' : 'Tidak ada kewajiban', 'fi-rr-wallet', 'text-rose-700 bg-rose-50'],
    ];

    return (
        <AdminLayout header="Detail Supplier">
            <Head title={supplier.name} />
            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Supplier', href: route('tenant.suppliers.index') }, { label: supplier.name }]} />
            <div className="space-y-5">
                <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-indigo-400/10" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-xl shadow-lg shadow-indigo-950"><i className="fi fi-rr-truck-side" /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[.22em] text-indigo-300">Profil supplier</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${supplier.is_active ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-white/10 text-slate-300 ring-1 ring-white/15'}`}>{supplier.is_active ? 'Aktif' : 'Nonaktif'}</span></div><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{supplier.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{supplier.note || 'Riwayat pasokan dan pembayaran supplier tersimpan di satu tempat.'}</p></div></div>
                        <div className="flex flex-wrap gap-2"><Link href={route('tenant.purchases.index', { supplier_id: supplier.id })} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15">Lihat semua pembelian</Link>{can('purchases.create') && supplier.is_active && <Link href={route('tenant.purchases.create')} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-400">Catat pembelian</Link>}</div>
                    </div>
                </section>

                <div className="grid gap-3 md:grid-cols-3">{cards.map(([label, value, note, icon, tone]) => <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={`fi ${icon}`} /></span></div></article>)}</div>

                <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Informasi supplier</p><h2 className="mt-1 font-bold text-slate-950">Kontak dan alamat</h2><dl className="mt-5 space-y-4">{contactRows.map(([icon, label, value]) => <div key={label} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><i className={`fi ${icon}`} /></span><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-700">{value}</dd></div></div>)}</dl></article>

                    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Riwayat pembelian</p><h2 className="mt-1 font-bold text-slate-950">Dokumen dari {supplier.name}</h2></div><div className="divide-y divide-slate-100">{purchases.data.map((purchase) => <div key={purchase.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><Link href={route('tenant.purchases.show', purchase.id)} className="font-mono text-sm font-bold text-indigo-700 hover:underline">{purchase.number}</Link><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${purchase.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : purchase.payment_status === 'overdue' ? 'bg-rose-50 text-rose-700' : purchase.payment_status === 'void' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>{purchaseStatus[purchase.payment_status] || purchase.payment_status}</span></div><p className="mt-1 text-xs text-slate-500">{date(purchase.purchase_date)} · Dicatat {purchase.creator?.name || 'Sistem'}</p></div><div className="sm:text-right"><p className="font-black text-slate-900">{money(purchase.total_amount)}</p>{Number(purchase.balance_amount) > 0 && <p className="mt-1 text-xs font-semibold text-rose-700">Sisa {money(purchase.balance_amount)}</p>}</div></div>)}</div>{!purchases.data.length && <div className="px-5 py-12 text-center text-sm text-slate-500">Belum ada pembelian dari supplier ini.</div>}<div className="border-t border-slate-100 p-4"><Pagination links={purchases.links} /></div></article>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Riwayat pembayaran</p><h2 className="mt-1 font-bold text-slate-950">Arus pembayaran ke supplier</h2></div><div className="divide-y divide-slate-100">{payments.data.map((payment) => <div key={payment.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center"><div><p className="font-mono text-sm font-bold text-slate-900">{payment.number}</p><p className="mt-1 text-xs text-slate-500">{date(payment.payment_date)} · {paymentMethod[payment.payment_method] || payment.payment_method}</p></div><div>{payment.purchase ? <Link href={route('tenant.purchases.show', payment.purchase.id)} className="text-sm font-semibold text-indigo-700 hover:underline">{payment.purchase.number}</Link> : <span className="text-sm text-slate-400">Dokumen tidak tersedia</span>}<p className="mt-1 text-xs text-slate-500">Dicatat {payment.creator?.name || 'Sistem'}</p></div><div className="flex items-center justify-between gap-4 md:block md:text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase md:hidden ${payment.status === 'valid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{payment.status === 'valid' ? 'Valid' : 'Dibatalkan'}</span><p className={`font-black ${payment.status === 'valid' ? 'text-emerald-700' : 'text-slate-400 line-through'}`}>{money(payment.amount)}</p><span className={`mt-1 hidden text-[10px] font-bold uppercase md:block ${payment.status === 'valid' ? 'text-emerald-700' : 'text-slate-400'}`}>{payment.status === 'valid' ? 'Valid' : 'Dibatalkan'}</span></div></div>)}</div>{!payments.data.length && <div className="px-5 py-12 text-center text-sm text-slate-500">Belum ada pembayaran untuk supplier ini.</div>}<div className="border-t border-slate-100 p-4"><Pagination links={payments.links} /></div></section>
            </div>
        </AdminLayout>
    );
}
