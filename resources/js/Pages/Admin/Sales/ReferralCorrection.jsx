import Breadcrumb from '@/Components/Breadcrumb';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function ReferralCorrection({ eligibleTenants, allSales }) {
    const toast = useToast();
    const [referralTenant, setReferralTenant] = useState('');
    const [referralSales, setReferralSales] = useState('');
    const [referralProcessing, setReferralProcessing] = useState(false);

    const activeSalesOptions = allSales.filter((item) => item.status === 'active').map((item) => ({ value: String(item.id), label: `${item.name} · ${item.referral_code}` }));
    const tenantOptions = useMemo(() => eligibleTenants.map((tenant) => ({ value: String(tenant.id), label: `${tenant.name} · ${tenant.email}` })), [eligibleTenants]);
    const selectedTenant = eligibleTenants.find((tenant) => String(tenant.id) === referralTenant);

    const updateReferral = () => {
        if (!referralTenant) return;
        setReferralProcessing(true);
        router.patch(route('admin.sales.tenant-referral.update', referralTenant), { sales_profile_id: referralSales || null }, {
            preserveScroll: true,
            onSuccess: () => { setReferralTenant(''); setReferralSales(''); },
            onError: () => toast.error('Atribusi referral tidak dapat diperbarui.'),
            onFinish: () => setReferralProcessing(false),
        });
    };

    return (
        <AdminLayout header="Koreksi Referral">
            <Head title="Koreksi Referral" />
            <Breadcrumb items={[{ label: 'SaaS' }, { label: 'Koreksi Referral' }]} homeHref={route('admin.dashboard')} />

            <div className="max-w-xl">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <h2 className="font-bold text-slate-900">Koreksi referral</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Hanya tenant yang belum mempunyai pembayaran disetujui.</p>
                    <div className="mt-5 space-y-3">
                        <Select
                            value={referralTenant}
                            onChange={(value) => {
                                setReferralTenant(value);
                                const tenant = eligibleTenants.find((item) => String(item.id) === value);
                                setReferralSales(tenant?.referred_by_sales_id ? String(tenant.referred_by_sales_id) : '');
                            }}
                            options={tenantOptions}
                            placeholder="Pilih tenant"
                        />
                        <Select value={referralSales} onChange={setReferralSales} options={[{ value: '', label: 'Tanpa referral' }, ...activeSalesOptions]} placeholder="Pilih sales" />
                        {selectedTenant && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Saat ini: <strong className="text-slate-700">{selectedTenant.referring_sales?.name ?? 'Tanpa referral'}</strong></p>}
                        <button disabled={!referralTenant || referralProcessing} onClick={updateReferral} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Simpan atribusi</button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
