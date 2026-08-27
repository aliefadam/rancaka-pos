import { Head, Link } from "@inertiajs/react";

const money = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
const methods = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", other: "Lainnya" };

export default function Receipt({ store, payment, purchase, supplier, back_url: backUrl }) {
    return (
        <>
            <Head title={`Kuitansi ${payment.number}`} />
            <main className="receipt-page min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
                <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
                    <Link href={backUrl} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                        <i className="fi fi-rr-arrow-left" /> Detail pembelian
                    </Link>
                    <div className="flex gap-2">
                        {payment.proof_url && <a href={payment.proof_url} target="_blank" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700">Bukti unggahan</a>}
                        <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-300">Cetak kuitansi</button>
                    </div>
                </div>

                <article className="relative mx-auto max-w-3xl overflow-hidden bg-white p-7 shadow-xl shadow-slate-300/50 print:max-w-none print:p-6 print:shadow-none sm:p-10">
                    <div className="absolute right-0 top-0 h-2 w-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400" />
                    {payment.status === "void" && <div className="pointer-events-none absolute inset-0 flex rotate-[-18deg] items-center justify-center text-7xl font-black tracking-[0.18em] text-rose-500/10">DIBATALKAN</div>}
                    <header className="relative flex flex-col gap-6 border-b-2 border-slate-900 pb-7 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-4">
                            {store.logo_url && <img src={store.logo_url} alt="Logo toko" className="h-14 w-14 rounded-2xl border border-slate-200 object-contain p-1" />}
                            <div>
                                <h1 className="text-xl font-black tracking-tight">{store.name}</h1>
                                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-600">{store.address || "Alamat toko belum diatur"}{store.phone ? ` · ${store.phone}` : ""}</p>
                            </div>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-600">Kuitansi Pembayaran</p>
                            <p className="mt-2 font-mono text-lg font-bold">{payment.number}</p>
                            <p className="mt-1 text-xs text-slate-500">{new Date(payment.payment_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                    </header>

                    <section className="relative grid gap-5 border-b border-dashed border-slate-300 py-7 sm:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Dibayarkan kepada</p>
                            <p className="mt-2 text-lg font-bold">{supplier.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{supplier.address || "Alamat supplier tidak dicatat"}</p>
                            {supplier.phone && <p className="mt-1 text-sm text-slate-600">{supplier.phone}</p>}
                        </div>
                        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Nominal pembayaran</p>
                            <p className="mt-2 text-3xl font-black tracking-tight">{money(payment.amount)}</p>
                            <p className="mt-2 text-xs text-slate-300">{methods[payment.payment_method] || payment.payment_method}{payment.reference_number ? ` · Ref ${payment.reference_number}` : ""}</p>
                        </div>
                    </section>

                    <section className="relative grid gap-x-8 gap-y-4 py-7 text-sm sm:grid-cols-2">
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Dokumen pembelian</span><b>{purchase.number}</b></div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Faktur supplier</span><b>{purchase.supplier_invoice_number || "-"}</b></div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Sisa sebelum</span><b>{money(payment.remaining_before)}</b></div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Sisa sesudah</span><b>{money(payment.remaining_after)}</b></div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Dicatat oleh</span><b>{payment.created_by || "-"}</b></div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Status</span><b className={payment.status === "valid" ? "text-emerald-700" : "text-rose-700"}>{payment.status === "valid" ? "Valid" : "Dibatalkan"}</b></div>
                    </section>

                    {payment.allocations.length > 0 && <section className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Alokasi termin</h2>
                        <div className="mt-3 space-y-2">{payment.allocations.map((item, index) => <div key={index} className="flex justify-between gap-4 text-sm"><span>Termin {item.sequence} · {new Date(item.due_date).toLocaleDateString("id-ID")}</span><b>{money(item.amount)}</b></div>)}</div>
                    </section>}

                    {payment.note && <p className="relative mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><b>Catatan:</b> {payment.note}</p>}
                    {payment.status === "void" && <div className="relative mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><b>Dibatalkan{payment.voided_by ? ` oleh ${payment.voided_by}` : ""}.</b> {payment.void_reason}</div>}

                    <footer className="relative mt-10 flex justify-between gap-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
                        <span>Dokumen internal · dibuat otomatis oleh Rancaka POS</span>
                        <span className="text-right">Kuitansi ini bukan bukti transfer bank.</span>
                    </footer>
                </article>
            </main>
        </>
    );
}
