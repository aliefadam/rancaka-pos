import Breadcrumb from "@/Components/Breadcrumb";
import FileDropzone from "@/Components/FileDropzone";
import MoneyInput from "@/Components/MoneyInput";
import PasswordConfirmDialog from "@/Components/PasswordConfirmDialog";
import Select from "@/Components/Select";
import AdminLayout from "@/Layouts/AdminLayout";
import usePermission from "@/Hooks/usePermission";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
const money = (v) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(v || 0);
const method = {
    cash: "Tunai",
    transfer: "Transfer",
    qris: "QRIS",
    other: "Lainnya",
};
const proofAccept = "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";
const maxProofSize = 12 * 1024 * 1024;
const maxProofSizeByType = { "application/pdf": 2 * 1024 * 1024 };
export default function Show({ purchase }) {
    const can = usePermission();
    const { auth } = usePage().props;
    const [payOpen, setPayOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [voidProcessing, setVoidProcessing] = useState(false);
    const [voidErrors, setVoidErrors] = useState({});
    const [paymentVoid, setPaymentVoid] = useState(null);
    const [paymentVoidErrors, setPaymentVoidErrors] = useState({});
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const pay = useForm({
        amount: purchase.balance_amount,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "cash",
        reference_number: "",
        installment_id: "",
        note: "",
        proof: null,
    });
    const schedule = useForm({
        reason: "",
        installments: purchase.installments.map((item) => ({
            id: item.id,
            due_date: item.due_date.slice(0, 10),
            planned_amount: item.planned_amount,
            paid_amount: item.paid_amount,
        })),
    });
    const scheduleTotal = schedule.data.installments.reduce(
        (sum, item) => sum + Number(item.planned_amount || 0),
        0,
    );
    const requiredScheduleTotal = purchase.installments.reduce(
        (sum, item) => sum + Number(item.planned_amount || 0),
        0,
    );
    const submit = (e) => {
        e.preventDefault();
        pay.post(route("tenant.purchases.payments.store", purchase.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setPayOpen(false),
        });
    };
    const openSchedule = () => {
        schedule.clearErrors();
        schedule.setData({
            reason: "",
            installments: purchase.installments.map((item) => ({
                id: item.id,
                due_date: item.due_date.slice(0, 10),
                planned_amount: item.planned_amount,
                paid_amount: item.paid_amount,
            })),
        });
        setScheduleOpen(true);
    };
    const submitSchedule = (event) => {
        event.preventDefault();
        schedule.put(
            route("tenant.purchases.installments.update", purchase.id),
            {
                preserveScroll: true,
                onSuccess: () => setScheduleOpen(false),
            },
        );
    };
    return (
        <AdminLayout header={purchase.number}>
            <Head title={purchase.number} />
            <Breadcrumb
                items={[
                    {
                        label: "Pembelian",
                        href: route("tenant.purchases.index"),
                    },
                    { label: purchase.number },
                ]}
            />
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {purchase.number}
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.document_status === "void" ? "bg-slate-100 text-slate-500" : purchase.balance_amount == 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                        >
                            {purchase.document_status === "void"
                                ? "Dibatalkan"
                                : purchase.balance_amount == 0
                                  ? "Lunas"
                                  : "Belum lunas"}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {purchase.supplier.name} ·{" "}
                        {new Date(purchase.purchase_date).toLocaleDateString(
                            "id-ID",
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cetak</button>
                    {auth.user.role === "owner" && purchase.document_status === "posted" && (
                        <button type="button" onClick={() => { setVoidErrors({}); setVoidOpen(true); }} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600">Batalkan</button>
                    )}
                    {purchase.balance_amount > 0 && purchase.document_status === "posted" && can("purchases.pay") && (
                        <button
                            onClick={() => setPayOpen(true)}
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Catat pembayaran
                        </button>
                    )}
                </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <main className="space-y-5">
                    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                        <div className="border-b px-5 py-4 font-bold">
                            Barang diterima
                        </div>
                        {purchase.items.map((i) => (
                            <div
                                key={i.id}
                                className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                            >
                                <div className="min-w-0">
                                    <b className="break-words text-slate-900">
                                        {i.item_name}
                                    </b>
                                    <div className="text-xs text-slate-500">
                                        {Number(i.quantity)} {i.unit_name} ×{" "}
                                        {money(i.unit_cost)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/70 px-3 py-2 sm:block sm:bg-transparent sm:p-0 sm:text-right">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:hidden">
                                        Total
                                    </span>
                                    <b className="break-all text-slate-900 sm:break-normal">
                                        {money(i.inventory_cost_total)}
                                    </b>
                                </div>
                            </div>
                        ))}
                    </section>
                    {purchase.payment_term === "installment" && (
                        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                                <div>
                                    <h3 className="font-bold text-slate-900">Jadwal termin</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">Nominal yang sudah terbayar tetap terkunci saat jadwal direvisi.</p>
                                </div>
                                {purchase.document_status === "posted" && can("purchases.pay") && (
                                    <button type="button" onClick={openSchedule} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
                                        Revisi jadwal
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-slate-100">
                                {purchase.installments.map((item) => (
                                    <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">{item.sequence}</div>
                                        <div>
                                            <div className="font-semibold text-slate-800">{new Date(item.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                                            <div className="mt-0.5 text-xs text-slate-500">Terbayar {money(item.paid_amount)}</div>
                                        </div>
                                        <div className="sm:text-right">
                                            <div className="font-bold text-slate-900">{money(item.planned_amount)}</div>
                                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.status === "paid" ? "bg-emerald-50 text-emerald-700" : item.status === "overdue" ? "bg-rose-50 text-rose-700" : item.status === "partial" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {purchase.installment_schedule_histories?.length > 0 && (
                                <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Histori revisi</h4>
                                    <div className="mt-3 space-y-2">
                                        {purchase.installment_schedule_histories.map((history) => (
                                            <details key={history.id} className="group rounded-xl border border-slate-200 bg-white p-3">
                                                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                                                    {history.actor?.name || "Pengguna terhapus"} · {new Date(history.created_at).toLocaleString("id-ID")}
                                                    <span className="ml-2 text-xs font-normal text-slate-500">{history.reason}</span>
                                                </summary>
                                                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                                                    {[['Sebelum', history.before_schedule], ['Sesudah', history.after_schedule]].map(([label, rows]) => (
                                                        <div key={label} className="rounded-lg bg-slate-50 p-3">
                                                            <b className="text-slate-700">{label}</b>
                                                            {rows.map((row) => <div key={`${label}-${row.id}-${row.sequence}`} className="mt-1 flex justify-between gap-3 text-slate-600"><span>Termin {row.sequence} · {new Date(row.due_date).toLocaleDateString("id-ID")}</span><span>{money(row.planned_amount)}</span></div>)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                        <h3 className="font-bold">Jejak pembayaran</h3>
                        <div className="mt-4 space-y-3">
                            {purchase.payments.map((p) => (
                                <div
                                    key={p.id}
                                    className={`rounded-xl border p-4 ${p.status === "void" ? "opacity-50" : "border-slate-200"}`}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <b className="break-all sm:break-normal">{p.number}</b>
                                            <div className="text-xs text-slate-500">
                                                {new Date(
                                                    p.payment_date,
                                                ).toLocaleDateString(
                                                    "id-ID",
                                                )}{" "}
                                                · {method[p.payment_method]}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/70 px-3 py-2 sm:block sm:bg-transparent sm:p-0 sm:text-right">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:hidden">
                                                Nominal
                                            </span>
                                            <b className="break-all sm:break-normal">{money(p.amount)}</b>
                                        </div>
                                    </div>
                                        <Link href={route("tenant.supplier-payments.receipt", p.id)} className="mt-2 inline-block text-xs font-semibold text-indigo-600">Kuitansi internal</Link>
                                        {p.proof_path && (
                                        <a
                                            href={route(
                                                "tenant.supplier-payments.proof",
                                                p.id,
                                            )}
                                            target="_blank"
                                            className="ml-3 mt-2 inline-block text-xs font-semibold text-indigo-600"
                                        >
                                            Lihat bukti ↗
                                            </a>
                                        )}
                                        {auth.user.role === "owner" && p.status === "valid" && (
                                            <button type="button" onClick={() => { setPaymentVoidErrors({}); setPaymentVoid(p); }} className="ml-3 mt-2 text-xs font-semibold text-rose-600">Batalkan pembayaran</button>
                                        )}
                                </div>
                            ))}
                            {!purchase.payments.length && (
                                <p className="text-sm text-slate-500">
                                    Belum ada pembayaran.
                                </p>
                            )}
                        </div>
                    </section>
                </main>
                <aside className="h-fit rounded-2xl bg-slate-900 p-5 text-white">
                    <h3 className="font-bold">Nilai pembelian</h3>
                    <div className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between text-slate-300">
                            <span>Subtotal</span>
                            <b className="text-white">
                                {money(purchase.items_subtotal)}
                            </b>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Diskon</span>
                            <b className="text-white">
                                − {money(purchase.discount_amount)}
                            </b>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Biaya tambahan</span>
                            <b className="text-white">
                                + {money(purchase.additional_cost_amount)}
                            </b>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-4 text-lg">
                            <span>Total</span>
                            <b>{money(purchase.total_amount)}</b>
                        </div>
                        <div className="flex justify-between text-emerald-300">
                            <span>Terbayar</span>
                            <b>{money(purchase.paid_amount)}</b>
                        </div>
                        <div className="flex justify-between text-amber-300">
                            <span>Sisa hutang</span>
                            <b>{money(purchase.balance_amount)}</b>
                        </div>
                    </div>
                    {purchase.supplier_invoice_path && (
                        <a
                            href={route(
                                "tenant.purchases.invoice",
                                purchase.id,
                            )}
                            target="_blank"
                            className="mt-5 block rounded-xl border border-slate-700 p-3 text-center text-sm font-semibold"
                        >
                            Lihat faktur supplier ↗
                        </a>
                    )}
                </aside>
            </div>
            {payOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <form
                            onSubmit={submit}
                            className="scrollbar-thin max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6"
                        >
                        <div className="flex justify-between">
                            <h3 className="text-lg font-bold">
                                Pembayaran supplier
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPayOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        {Object.values(pay.errors)[0] && (
                            <p className="mt-3 text-sm text-rose-600">
                                {Object.values(pay.errors)[0]}
                            </p>
                        )}
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm">
                                Nominal
                                <MoneyInput
                                    min="1"
                                    max={purchase.balance_amount}
                                    value={pay.data.amount}
                                    onValueChange={(value) => pay.setData("amount", value)}
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                />
                            </label>
                            <label className="text-sm">
                                Tanggal
                                <input
                                    type="date"
                                    value={pay.data.payment_date}
                                    onChange={(e) =>
                                        pay.setData(
                                            "payment_date",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                />
                            </label>
                            <label className="text-sm">
                                Metode
                                <Select
                                    value={pay.data.payment_method}
                                    onChange={(value) =>
                                        pay.setData(
                                            "payment_method",
                                            value,
                                        )
                                    }
                                    options={[
                                        { value: "cash", label: "Tunai" },
                                        { value: "transfer", label: "Transfer" },
                                        { value: "qris", label: "QRIS" },
                                        { value: "other", label: "Lainnya" },
                                    ]}
                                    className="mt-1 w-full"
                                    searchPlaceholder="Cari metode..."
                                />
                            </label>
                            <label className="text-sm">
                                No. referensi
                                <input
                                    value={pay.data.reference_number}
                                    onChange={(e) =>
                                        pay.setData(
                                            "reference_number",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                />
                            </label>
                            <div className="sm:col-span-2">
                                <FileDropzone
                                    label="Bukti pembayaran"
                                    required={pay.data.payment_method !== "cash"}
                                    file={pay.data.proof}
                                    onFileChange={(file) => pay.setData("proof", file)}
                                    accept={proofAccept}
                                    maxSize={maxProofSize}
                                    maxSizeByType={maxProofSizeByType}
                                    helperText="JPG, PNG, WEBP, atau PDF"
                                    error={pay.errors.proof}
                                />
                            </div>
                        </div>
                        <button
                            disabled={pay.processing}
                            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white"
                        >
                            Simpan pembayaran
                        </button>
                        </form>
                    </div>
                </div>
            )}
            {scheduleOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center">
                        <form onSubmit={submitSchedule} className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Kontrol hutang</p>
                                    <h3 className="mt-1 text-xl font-bold text-slate-900">Revisi jadwal termin</h3>
                                    <p className="mt-1 text-sm text-slate-500">Total jadwal wajib tetap {money(requiredScheduleTotal)}.</p>
                                </div>
                                <button type="button" onClick={() => setScheduleOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">×</button>
                            </div>
                            <div className="scrollbar-thin max-h-[65vh] space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
                                {Object.values(schedule.errors)[0] && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{Object.values(schedule.errors)[0]}</p>}
                                {schedule.data.installments.map((item, index) => (
                                    <div key={item.id || `new-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[44px_1fr_1fr_auto] sm:items-end">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">{index + 1}</div>
                                        <label className="text-xs font-semibold text-slate-600">Jatuh tempo
                                            <input type="date" min={purchase.purchase_date.slice(0, 10)} value={item.due_date} onChange={(event) => schedule.setData("installments", schedule.data.installments.map((row, rowIndex) => rowIndex === index ? { ...row, due_date: event.target.value } : row))} className="mt-1 block w-full rounded-xl border-slate-200 text-sm" />
                                        </label>
                                        <label className="text-xs font-semibold text-slate-600">Nominal
                                            <MoneyInput min={Math.max(1, Number(item.paid_amount || 0))} value={item.planned_amount} onValueChange={(value) => schedule.setData("installments", schedule.data.installments.map((row, rowIndex) => rowIndex === index ? { ...row, planned_amount: value } : row))} className="mt-1 w-full rounded-xl border-slate-200 text-sm" />
                                            {Number(item.paid_amount) > 0 && <span className="mt-1 block text-[10px] text-emerald-700">Terkunci min. {money(item.paid_amount)}</span>}
                                        </label>
                                        <button type="button" disabled={Number(item.paid_amount) > 0 || schedule.data.installments.length === 1} onClick={() => schedule.setData("installments", schedule.data.installments.filter((_, rowIndex) => rowIndex !== index))} className="h-10 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">Hapus</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => schedule.setData("installments", [...schedule.data.installments, { id: null, due_date: purchase.due_date.slice(0, 10), planned_amount: 1, paid_amount: 0 }])} className="w-full rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">+ Tambah termin</button>
                                <label className="block text-sm font-semibold text-slate-700">Alasan revisi
                                    <textarea rows="3" value={schedule.data.reason} onChange={(event) => schedule.setData("reason", event.target.value)} placeholder="Contoh: kesepakatan ulang jatuh tempo dengan supplier" className="mt-1 block w-full rounded-xl border-slate-200 text-sm" />
                                </label>
                            </div>
                            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className={`text-sm font-bold ${scheduleTotal === requiredScheduleTotal ? "text-emerald-700" : "text-rose-700"}`}>Total jadwal: {money(scheduleTotal)}</div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setScheduleOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Batal</button>
                                    <button disabled={schedule.processing || scheduleTotal !== requiredScheduleTotal} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Simpan revisi</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <PasswordConfirmDialog
                show={voidOpen}
                onClose={() => setVoidOpen(false)}
                onConfirm={(data) => {
                    setVoidProcessing(true);
                    router.patch(route("tenant.purchases.void", purchase.id), data, {
                        preserveScroll: true,
                        onError: setVoidErrors,
                        onSuccess: () => setVoidOpen(false),
                        onFinish: () => setVoidProcessing(false),
                    });
                }}
                processing={voidProcessing}
                errors={voidErrors}
                title="Batalkan pembelian?"
                message="Stok dan HPP akan dikembalikan hanya jika belum ada pergerakan stok setelah penerimaan ini."
                totalLabel={money(purchase.total_amount)}
                actionLabel="Batalkan pembelian"
            />
            <PasswordConfirmDialog
                show={Boolean(paymentVoid)}
                onClose={() => setPaymentVoid(null)}
                onConfirm={(data) => {
                    setVoidProcessing(true);
                    router.patch(route("tenant.supplier-payments.void", paymentVoid.id), data, {
                        preserveScroll: true,
                        onError: setPaymentVoidErrors,
                        onSuccess: () => setPaymentVoid(null),
                        onFinish: () => setVoidProcessing(false),
                    });
                }}
                processing={voidProcessing}
                errors={paymentVoidErrors}
                title="Batalkan pembayaran?"
                message="Nominal ini akan kembali menjadi hutang supplier dan tetap tersimpan di audit."
                totalLabel={paymentVoid ? money(paymentVoid.amount) : ""}
                actionLabel="Batalkan pembayaran"
            />
        </AdminLayout>
    );
}
