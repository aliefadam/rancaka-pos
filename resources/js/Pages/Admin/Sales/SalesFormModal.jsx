import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const emptyForm = {
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    referral_code: '',
    commission_rate: '10',
    status: 'active',
};

export default function SalesFormModal({ show, onClose, sales }) {
    const toast = useToast();
    const form = useForm(emptyForm);
    const isEdit = Boolean(sales);

    useEffect(() => {
        if (!show) return;
        form.setData(sales ? {
            name: sales.name,
            username: sales.user?.username ?? '',
            password: '',
            email: sales.email ?? '',
            phone: sales.phone ?? '',
            referral_code: sales.referral_code,
            commission_rate: sales.commission_rate,
            status: sales.status,
        } : emptyForm);
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, sales]);

    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: () => toast.error('Periksa kembali data sales.'),
        };
        if (isEdit) form.put(route('admin.sales.update', sales.id), options);
        else form.post(route('admin.sales.store'), options);
    };

    const inputClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit}>
                <Modal.Header>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Profil referral</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">{isEdit ? 'Edit sales' : 'Tambah sales'}</h2>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nama sales" error={form.errors.name} wide>
                            <input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className={inputClass} placeholder="Budi Santoso" />
                        </Field>
                        <Field label="Username login" error={form.errors.username}>
                            <input value={form.data.username} onChange={(e) => form.setData('username', e.target.value.replace(/\s/g, ''))} className={inputClass} placeholder="budi.sales" />
                        </Field>
                        <Field label={isEdit ? 'Password baru (opsional)' : 'Password'} error={form.errors.password}>
                            <input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className={inputClass} placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'} />
                        </Field>
                        <Field label="Email (opsional)" error={form.errors.email}>
                            <input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className={inputClass} placeholder="budi@email.com" />
                        </Field>
                        <Field label="WhatsApp (opsional)" error={form.errors.phone}>
                            <input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} className={inputClass} placeholder="08xxxxxxxxxx" />
                        </Field>
                        <Field label="Kode referral" error={form.errors.referral_code}>
                            <input value={form.data.referral_code} onChange={(e) => form.setData('referral_code', e.target.value.toUpperCase().replace(/\s/g, ''))} className={`${inputClass} font-bold uppercase tracking-wide`} placeholder="SALESBUDI" />
                        </Field>
                        <Field label="Komisi (%)" error={form.errors.commission_rate}>
                            <input type="number" min="0" max="100" step="0.01" value={form.data.commission_rate} onChange={(e) => form.setData('commission_rate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Status" error={form.errors.status}>
                            <Select value={form.data.status} onChange={(value) => form.setData('status', value)} options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
                        </Field>
                    </div>
                    <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs leading-relaxed text-indigo-700">
                        Perubahan persentase hanya berlaku untuk pembayaran pertama yang disetujui setelah perubahan. Komisi lama tetap memakai persentase snapshot.
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                    <button disabled={form.processing} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">{form.processing ? 'Menyimpan...' : 'Simpan sales'}</button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}

function Field({ label, error, wide = false, children }) {
    return <div className={wide ? 'sm:col-span-2' : ''}><label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>{children}{error && <p className="mt-1 text-xs text-rose-600">{error}</p>}</div>;
}
