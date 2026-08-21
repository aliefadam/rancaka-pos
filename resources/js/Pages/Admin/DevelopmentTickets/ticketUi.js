export const statusUi = {
    pending: { label: 'Belum Dikerjakan', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: 'fi-rr-inbox' },
    in_progress: { label: 'Diproses', className: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', icon: 'fi-rr-progress-complete' },
    completed: { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: 'fi-rr-check-circle' },
    revision: { label: 'Perlu Revisi', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: 'fi-rr-refresh' },
};

export const priorityUi = {
    low: { label: 'Rendah', className: 'text-slate-500' },
    normal: { label: 'Normal', className: 'text-indigo-600' },
    high: { label: 'Tinggi', className: 'text-orange-600' },
    urgent: { label: 'Urgent', className: 'text-rose-600' },
};

export const typeLabels = { feature: 'Fitur', bug: 'Bug', improvement: 'Improvement' };
export const shortDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const longDate = (value) => value ? new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
