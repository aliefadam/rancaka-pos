import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';

const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value ?? 0));
const date = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusTone = {
    projected: 'bg-sky-50 text-sky-700 ring-sky-100',
    accrued: 'bg-amber-50 text-amber-700 ring-amber-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};
const statusLabel = { projected: 'Proyeksi', accrued: 'Belum dibayar', paid: 'Sudah dibayar' };

export default function Dashboard({ sales, downlines, metrics, payouts }) {
    return (
        <AdminLayout header="Dashboard Referral">
            <Head title="Dashboard Referral" />

            <section className="relative overflow-hidden rounded-3xl bg-[#10251f] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
                <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[44px] border-[#c8f169]/10" />
                <div className="absolute bottom-0 left-1/2 h-px w-72 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c8f169]/60 to-transparent" />
                <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c8f169]">Partner referral</p>
                        <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Halo, {sales.name}. Ini jejak pertumbuhanmu.</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/70">Pantau tenant yang bergabung melalui kodemu dan nilai komisi pembayaran pertama mereka.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/50">Kode referral</p>
                        <div className="mt-2 flex items-center gap-4"><code className="text-xl font-black tracking-[0.16em] text-[#c8f169]">{sales.referral_code}</code><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{Number(sales.commission_rate)}%</span></div>
                    </div>
                </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Total downline" value={metrics.referrals} note={`${metrics.trialing} trial · ${metrics.active} aktif`} icon="fi-rr-users-alt" tone="bg-sky-50 text-sky-700" />
                <Metric label="Total estimasi" value={money(metrics.estimated_total)} note="Aktual + proyeksi" icon="fi-rr-chart-histogram" tone="bg-violet-50 text-violet-700" />
                <Metric label="Belum dibayar" value={money(metrics.accrued)} note="Siap dipayout admin" icon="fi-rr-hourglass-end" tone="bg-amber-50 text-amber-700" />
                <Metric label="Sudah dibayar" value={money(metrics.paid)} note={`Proyeksi ${money(metrics.projected)}`} icon="fi-rr-check-circle" tone="bg-emerald-50 text-emerald-700" />
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Downline</p><h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Tenant dari referral Anda</h2></div>
                    <p className="max-w-md text-xs leading-5 text-slate-400">Proyeksi belum menjadi saldo payout sampai pembayaran pertama tenant disetujui.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead><tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Tenant</th><th className="px-4 py-3">Subscription</th><th className="px-4 py-3">Dasar estimasi</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Komisi</th><th className="px-4 py-3">Status</th></tr></thead>
                        <tbody>{downlines.map((item) => <tr key={item.id} className="border-t border-slate-100 text-sm transition hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.name}</p><p className="mt-0.5 text-xs text-slate-400">Referral {date(item.referred_at)}</p></td><td className="px-4 py-4"><p className="font-semibold capitalize text-slate-700">{item.subscription_status}</p><p className="mt-0.5 text-xs text-slate-400">s.d. {date(item.subscription_ends_at)}</p></td><td className="px-4 py-4"><p className="font-medium text-slate-700">{money(item.invoice_amount)}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.invoice_number ?? 'Belum ada invoice'}</p></td><td className="px-4 py-4 font-bold text-slate-600">{Number(item.commission_rate)}%</td><td className="px-4 py-4 font-black text-slate-900">{money(item.commission_amount)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${statusTone[item.commission_status]}`}>{statusLabel[item.commission_status]}</span></td></tr>)}{downlines.length === 0 && <tr><td colSpan="6" className="px-5 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300"><i className="fi fi-rr-users-alt text-xl" /></span><p className="mt-3 text-sm font-semibold text-slate-500">Belum ada downline referral</p><p className="mt-1 text-xs text-slate-400">Bagikan kode {sales.referral_code} kepada calon tenant.</p></td></tr>}</tbody>
                    </table>
                </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Riwayat payout</p><h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Komisi yang telah dibayarkan</h2></div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{payouts.map((item) => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold tracking-wide text-slate-400">{item.number}</p><p className="mt-1 text-sm font-semibold text-slate-700">{date(item.paid_at)}</p></div><p className="font-black text-emerald-700">{money(item.amount)}</p></div>{item.note && <p className="mt-3 text-xs leading-5 text-slate-500">{item.note}</p>}{item.proof_url && <a href={item.proof_url} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><i className="fi fi-rr-document" /> Lihat bukti</a>}</article>)}{payouts.length === 0 && <p className="col-span-full py-8 text-center text-sm text-slate-400">Belum ada payout.</p>}</div>
            </section>
        </AdminLayout>
    );
}

function Metric({ label, value, note, icon, tone }) {
    return <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={`fi ${icon}`} /></span><p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>;
}
