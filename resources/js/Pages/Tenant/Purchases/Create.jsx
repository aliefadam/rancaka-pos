import Breadcrumb from "@/Components/Breadcrumb";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, Link, useForm } from "@inertiajs/react";
const money = (v) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(v || 0);
const today = new Date().toISOString().slice(0, 10);
export default function Create({ suppliers, products, rawMaterials }) {
    const form = useForm({
        supplier_id: "",
        purchase_date: today,
        supplier_invoice_number: "",
        payment_term: "paid",
        due_date: "",
        items: [
            { item_type: "product", item_id: "", quantity: 1, unit_cost: 0 },
        ],
        discount_amount: 0,
        additional_cost_amount: 0,
        additional_cost_note: "",
        initial_payment_amount: 0,
        initial_payment_method: "cash",
        initial_reference_number: "",
        installments: [],
        supplier_invoice: null,
        initial_payment_proof: null,
        note: "",
    });
    const subtotal = form.data.items.reduce(
        (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0),
        0,
    );
    const total = Math.max(
        0,
        subtotal -
            Number(form.data.discount_amount || 0) +
            Number(form.data.additional_cost_amount || 0),
    );
    const initial =
        form.data.payment_term === "paid"
            ? total
            : Number(form.data.initial_payment_amount || 0);
    const balance = total - initial;
    const setItem = (idx, key, value) =>
        form.setData(
            "items",
            form.data.items.map((i, n) =>
                n === idx ? { ...i, [key]: value } : i,
            ),
        );
    const options = (type) => (type === "product" ? products : rawMaterials);
    const submit = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            initial_payment_amount:
                data.payment_term === "paid"
                    ? total
                    : data.payment_term === "credit"
                      ? 0
                      : data.initial_payment_amount,
        })).post(route("tenant.purchases.store"), { forceFormData: true });
    };
    return (
        <AdminLayout header="Catat Pembelian">
            <Head title="Catat Pembelian" />
            <Breadcrumb
                items={[
                    {
                        label: "Pembelian",
                        href: route("tenant.purchases.index"),
                    },
                    { label: "Catat baru" },
                ]}
            />
            <form onSubmit={submit} className="max-w-6xl space-y-5">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">
                            Dokumen baru
                        </p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-900">
                            Catat pembelian
                        </h2>
                    </div>
                    <Link
                        href={route("tenant.purchases.index")}
                        className="text-sm font-medium text-slate-500"
                    >
                        Batal
                    </Link>
                </div>
                {Object.keys(form.errors).length > 0 && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        {Object.values(form.errors)[0]}
                    </div>
                )}
                <section className="grid gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 md:grid-cols-3">
                    <label className="text-sm text-slate-600">
                        Supplier *
                        <select
                            value={form.data.supplier_id}
                            onChange={(e) =>
                                form.setData("supplier_id", e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border-slate-200"
                        >
                            <option value="">Pilih supplier</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm text-slate-600">
                        Tanggal pembelian *
                        <input
                            type="date"
                            max={today}
                            value={form.data.purchase_date}
                            onChange={(e) =>
                                form.setData("purchase_date", e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border-slate-200"
                        />
                    </label>
                    <label className="text-sm text-slate-600">
                        No. faktur supplier
                        <input
                            value={form.data.supplier_invoice_number}
                            onChange={(e) =>
                                form.setData(
                                    "supplier_invoice_number",
                                    e.target.value,
                                )
                            }
                            className="mt-1 w-full rounded-xl border-slate-200"
                        />
                    </label>
                </section>
                <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                    <div className="flex items-center justify-between border-b p-5">
                        <div>
                            <h3 className="font-bold text-slate-900">
                                Barang diterima
                            </h3>
                            <p className="text-xs text-slate-500">
                                Produk dan bahan baku boleh dicampur.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                form.setData("items", [
                                    ...form.data.items,
                                    {
                                        item_type: "product",
                                        item_id: "",
                                        quantity: 1,
                                        unit_cost: 0,
                                    },
                                ])
                            }
                            className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700"
                        >
                            + Baris
                        </button>
                    </div>
                    <div className="space-y-3 p-5">
                        {form.data.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[150px_1fr_120px_170px_40px]"
                            >
                                <select
                                    value={item.item_type}
                                    onChange={(e) => {
                                        setItem(
                                            idx,
                                            "item_type",
                                            e.target.value,
                                        );
                                        setItem(idx, "item_id", "");
                                    }}
                                    className="rounded-lg border-slate-200 text-sm"
                                >
                                    <option value="product">Produk</option>
                                    <option value="raw_material">
                                        Bahan baku
                                    </option>
                                </select>
                                <select
                                    value={item.item_id}
                                    onChange={(e) =>
                                        setItem(idx, "item_id", e.target.value)
                                    }
                                    className="rounded-lg border-slate-200 text-sm"
                                >
                                    <option value="">Pilih barang</option>
                                    {options(item.item_type).map((x) => (
                                        <option key={x.id} value={x.id}>
                                            {x.name} · stok {x.stock}{" "}
                                            {x.unit || "pcs"}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    step={
                                        item.item_type === "product" ? 1 : 0.01
                                    }
                                    min="0.01"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        setItem(idx, "quantity", e.target.value)
                                    }
                                    className="rounded-lg border-slate-200 text-sm"
                                    placeholder="Jumlah"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={item.unit_cost}
                                    onChange={(e) =>
                                        setItem(
                                            idx,
                                            "unit_cost",
                                            e.target.value,
                                        )
                                    }
                                    className="rounded-lg border-slate-200 text-sm"
                                    placeholder="Harga beli"
                                />
                                <button
                                    type="button"
                                    disabled={form.data.items.length === 1}
                                    onClick={() =>
                                        form.setData(
                                            "items",
                                            form.data.items.filter(
                                                (_, n) => n !== idx,
                                            ),
                                        )
                                    }
                                    className="text-rose-500 disabled:opacity-30"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
                <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                    <section className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                        <h3 className="font-bold">Pembayaran</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                ["paid", "Lunas"],
                                ["credit", "Tempo"],
                                ["installment", "Cicilan"],
                            ].map(([v, l]) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() =>
                                        form.setData("payment_term", v)
                                    }
                                    className={`rounded-xl border p-3 text-sm font-semibold ${form.data.payment_term === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                        {form.data.payment_term !== "paid" && (
                            <label className="block text-sm text-slate-600">
                                Jatuh tempo akhir *
                                <input
                                    type="date"
                                    min={form.data.purchase_date}
                                    value={form.data.due_date}
                                    onChange={(e) =>
                                        form.setData("due_date", e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                />
                            </label>
                        )}
                        {form.data.payment_term === "installment" && (
                            <label className="block text-sm text-slate-600">
                                Pembayaran awal *
                                <input
                                    type="number"
                                    min="1"
                                    max={Math.max(1, total - 1)}
                                    value={form.data.initial_payment_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            "initial_payment_amount",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-xl border-slate-200"
                                />
                            </label>
                        )}
                        {form.data.payment_term === "installment" && (
                            <div className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <b className="text-sm">Jadwal termin opsional</b>
                                        <p className="text-xs text-slate-500">Kosongkan untuk satu jatuh tempo akhir.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => form.setData("installments", [...form.data.installments, { due_date: form.data.due_date, amount: Math.max(0, balance - form.data.installments.reduce((sum, row) => sum + Number(row.amount || 0), 0)) }])}
                                        className="shrink-0 text-sm font-semibold text-indigo-600"
                                    >+ Termin</button>
                                </div>
                                {form.data.installments.map((row, index) => (
                                    <div key={index} className="mt-3 grid gap-2 rounded-xl bg-slate-50/70 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                        <label className="text-xs font-medium text-slate-500">
                                            Jatuh tempo
                                            <input type="date" min={form.data.purchase_date} value={row.due_date} onChange={(e) => form.setData("installments", form.data.installments.map((item, itemIndex) => itemIndex === index ? { ...item, due_date: e.target.value } : item))} className="mt-1 w-full rounded-lg border-slate-200 text-sm" />
                                        </label>
                                        <label className="text-xs font-medium text-slate-500">
                                            Nominal
                                            <input type="number" min="1" value={row.amount} onChange={(e) => form.setData("installments", form.data.installments.map((item, itemIndex) => itemIndex === index ? { ...item, amount: e.target.value } : item))} className="mt-1 w-full rounded-lg border-slate-200 text-sm" />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => form.setData("installments", form.data.installments.filter((_, itemIndex) => itemIndex !== index))}
                                            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 sm:w-10"
                                            aria-label={`Hapus termin ${index + 1}`}
                                        >
                                            <i className="fi fi-rr-trash" />
                                            <span className="sm:hidden">Hapus termin</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {form.data.payment_term !== "credit" && (
                            <>
                                <label className="block text-sm text-slate-600">
                                    Metode pembayaran awal
                                    <select
                                        value={form.data.initial_payment_method}
                                        onChange={(e) =>
                                            form.setData(
                                                "initial_payment_method",
                                                e.target.value,
                                            )
                                        }
                                        className="mt-1 w-full rounded-xl border-slate-200"
                                    >
                                        <option value="cash">Tunai</option>
                                        <option value="transfer">
                                            Transfer bank
                                        </option>
                                        <option value="qris">QRIS</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </label>
                                <label className="block text-sm text-slate-600">
                                    Bukti pembayaran{" "}
                                    {form.data.initial_payment_method !==
                                        "cash" && "*"}
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) =>
                                            form.setData(
                                                "initial_payment_proof",
                                                e.target.files[0],
                                            )
                                        }
                                        className="mt-1 block w-full text-sm"
                                    />
                                </label>
                            </>
                        )}
                    </section>
                    <aside className="rounded-2xl bg-slate-900 p-5 text-white">
                        <h3 className="font-bold">Ringkasan nilai</h3>
                        <div className="mt-5 space-y-3 text-sm">
                            <div className="flex justify-between text-slate-300">
                                <span>Subtotal</span>
                                <b className="text-white">{money(subtotal)}</b>
                            </div>
                            <label className="flex items-center justify-between gap-3 text-slate-300">
                                <span>Diskon</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.data.discount_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            "discount_amount",
                                            e.target.value,
                                        )
                                    }
                                    className="w-32 rounded-lg border-slate-700 bg-slate-800 text-right text-white"
                                />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-slate-300">
                                <span>Biaya tambahan</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.data.additional_cost_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            "additional_cost_amount",
                                            e.target.value,
                                        )
                                    }
                                    className="w-32 rounded-lg border-slate-700 bg-slate-800 text-right text-white"
                                />
                            </label>
                            <div className="border-t border-slate-700 pt-4">
                                <div className="flex justify-between text-lg">
                                    <span>Total</span>
                                    <b>{money(total)}</b>
                                </div>
                                {balance > 0 && (
                                    <div className="mt-2 flex justify-between text-amber-300">
                                        <span>Menjadi hutang</span>
                                        <b>{money(balance)}</b>
                                    </div>
                                )}
                            </div>
                        </div>
                        <label className="mt-6 block text-xs text-slate-400">
                            Nota / faktur supplier
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) =>
                                    form.setData(
                                        "supplier_invoice",
                                        e.target.files[0],
                                    )
                                }
                                className="mt-2 block w-full text-xs text-slate-300"
                            />
                        </label>
                        <button
                            disabled={form.processing || total <= 0}
                            className="mt-6 w-full rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white disabled:opacity-50"
                        >
                            {form.processing
                                ? "Memproses..."
                                : "Posting pembelian"}
                        </button>
                    </aside>
                </div>
            </form>
        </AdminLayout>
    );
}
