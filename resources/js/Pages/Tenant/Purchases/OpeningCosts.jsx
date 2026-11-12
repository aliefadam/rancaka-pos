import Breadcrumb from '@/Components/Breadcrumb';
import MoneyInput from '@/Components/MoneyInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';

function Row({ material }) {
    const form = useForm({ average_cost: '' });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.put(
                    route('tenant.purchases.opening-costs.update', material.id),
                    { preserveScroll: true },
                );
            }}
            className="grid items-center gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_180px_auto]"
        >
            <div>
                <b>{material.name}</b>
                <div className="text-xs text-slate-500">
                    Stok lama: {Number(material.stock)} {material.unit}
                </div>
            </div>
            <MoneyInput
                min="0"
                required
                placeholder="Modal per item per unit"
                value={form.data.average_cost}
                onValueChange={(value) => form.setData('average_cost', value)}
                className="rounded-xl border-slate-200"
            />
            <button className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">
                Tetapkan
            </button>
        </form>
    );
}

export default function OpeningCosts({ materials }) {
    return (
        <AdminLayout header="Saldo Awal Modal per item">
            <Head title="Saldo Awal Modal per item" />
            <Breadcrumb
                items={[
                    {
                        label: 'Belanja Stok',
                        href: route('tenant.purchases.index'),
                    },
                    { label: 'Saldo awal Modal per item' },
                ]}
            />
            <div className="mb-6 max-w-2xl">
                <h2 className="text-2xl font-bold">Saldo awal Modal per item bahan baku</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Isi biaya rata-rata stok yang sudah ada. Nilai ini menjadi
                    dasar moving average saat belanja stok pertama dicatat.
                </p>
            </div>
            <div className="max-w-3xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                {materials.map((material) => (
                    <Row key={material.id} material={material} />
                ))}
                {!materials.length && (
                    <div className="p-10 text-center text-sm text-emerald-700">
                        Semua saldo awal Modal per item sudah siap.
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
