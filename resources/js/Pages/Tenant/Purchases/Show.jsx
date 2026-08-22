import Breadcrumb from "@/Components/Breadcrumb";
import PasswordConfirmDialog from "@/Components/PasswordConfirmDialog";
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
export default function Show({ purchase }) {
    const can = usePermission();
    const { auth } = usePage().props;
    const [payOpen, setPayOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [voidProcessing, setVoidProcessing] = useState(false);
    const [voidErrors, setVoidErrors] = useState({});
    const [paymentVoid, setPaymentVoid] = useState(null);
    const [paymentVoidErrors, setPaymentVoidErrors] = useState({});
    const pay = useForm({
        amount: purchase.balance_amount,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "cash",
        reference_number: "",
        installment_id: "",
        note: "",
        proof: null,
    });
    const submit = (e) => {
        e.preventDefault();
        pay.post(route("tenant.purchases.payments.store", purchase.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setPayOpen(false),
        });
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
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b px-5 py-4 font-bold">
                            Barang diterima
                        </div>
                        {purchase.items.map((i) => (
                            <div
                                key={i.id}
                                className="grid grid-cols-[1fr_auto] border-b border-slate-100 px-5 py-4"
                            >
                                <div>
                                    <b className="text-slate-900">
                                        {i.item_name}
                                    </b>
                                    <div className="text-xs text-slate-500">
                                        {Number(i.quantity)} {i.unit_name} ×{" "}
                                        {money(i.unit_cost)}
                                    </div>
                                </div>
                                <b>{money(i.inventory_cost_total)}</b>
                            </div>
                        ))}
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="font-bold">Jejak pembayaran</h3>
                        <div className="mt-4 space-y-3">
                            {purchase.payments.map((p) => (
                                <div
                                    key={p.id}
                                    className={`rounded-xl border p-4 ${p.status === "void" ? "opacity-50" : "border-slate-200"}`}
                                >
                                    <div className="flex justify-between">
                                        <div>
                                            <b>{p.number}</b>
                                            <div className="text-xs text-slate-500">
                                                {new Date(
                                                    p.payment_date,
                                                ).toLocaleDateString(
                                                    "id-ID",
                                                )}{" "}
                                                · {method[p.payment_method]}
                                            </div>
                                        </div>
                                        <b>{money(p.amount)}</b>
                                    </div>
                                        {p.proof_path && (
                                        <a
                                            href={route(
                                                "tenant.supplier-payments.proof",
                                                p.id,
                                            )}
                                            target="_blank"
                                            className="mt-2 inline-block text-xs font-semibold text-indigo-600"
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
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
                    <form
                        onSubmit={submit}
                        className="w-full max-w-lg rounded-2xl bg-white p-6"
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
                                <input
                                    type="number"
                                    min="1"
                                    max={purchase.balance_amount}
                                    value={pay.data.amount}
                                    onChange={(e) =>
                                        pay.setData("amount", e.target.value)
                                    }
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
                                <select
                                    value={pay.data.payment_method}
                                    onChange={(e) =>
                                        pay.setData(
                                            "payment_method",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                >
                                    <option value="cash">Tunai</option>
                                    <option value="transfer">Transfer</option>
                                    <option value="qris">QRIS</option>
                                    <option value="other">Lainnya</option>
                                </select>
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
                            <label className="sm:col-span-2 text-sm">
                                Bukti{" "}
                                {pay.data.payment_method !== "cash" && "*"}
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) =>
                                        pay.setData("proof", e.target.files[0])
                                    }
                                    className="mt-1 block w-full"
                                />
                            </label>
                        </div>
                        <button
                            disabled={pay.processing}
                            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white"
                        >
                            Simpan pembayaran
                        </button>
                    </form>
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
