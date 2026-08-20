import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function ProductImportModal({ show, onClose, importErrors = [] }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const { data, setData, post, processing, errors, clearErrors, reset } =
        useForm({ file: null });

    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
            if (inputRef.current) inputRef.current.value = '';
        }
    }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

    const chooseFile = (file) => {
        setData('file', file ?? null);
        clearErrors('file');
    };

    const submit = (event) => {
        event.preventDefault();
        post(route('tenant.products.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                if (!page.props.flash?.import_errors?.length) {
                    onClose();
                }
            },
        });
    };

    return (
        <Modal show={show} onClose={onClose} closeable={!processing} maxWidth="lg">
            <form onSubmit={submit}>
                <Modal.Header>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">
                            Import Produk
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Tambahkan banyak produk sekaligus dari Excel.
                        </p>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                                <i className="fi fi-rr-file-download" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800">
                                    Mulai dengan template
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Jangan ubah judul kolom. Pilihan kategori sudah
                                    disesuaikan dengan data kedai Anda.
                                </p>
                                <a
                                    href={route('tenant.products.import.template')}
                                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                                >
                                    <i className="fi fi-rr-download" />
                                    Download template Excel
                                </a>
                            </div>
                        </div>
                    </div>

                    <div
                        onDragEnter={(event) => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            chooseFile(event.dataTransfer.files?.[0]);
                        }}
                        className={`mt-4 rounded-xl border-2 border-dashed px-5 py-7 text-center transition ${
                            dragging
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-slate-200 bg-slate-50/50'
                        }`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(event) => chooseFile(event.target.files?.[0])}
                        />
                        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg text-indigo-600 shadow-sm ring-1 ring-slate-100">
                            <i className="fi fi-rr-cloud-upload-alt" />
                        </span>
                        {data.file ? (
                            <>
                                <p className="mt-3 truncate text-sm font-semibold text-slate-800">
                                    {data.file.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {(data.file.size / 1024).toLocaleString('id-ID', {
                                        maximumFractionDigits: 1,
                                    })}{' '}
                                    KB
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="mt-3 text-sm font-medium text-slate-700">
                                    Tarik file ke sini atau{' '}
                                    <button
                                        type="button"
                                        onClick={() => inputRef.current?.click()}
                                        className="font-semibold text-indigo-600 hover:text-indigo-700"
                                    >
                                        pilih file
                                    </button>
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    XLSX, XLS, atau CSV · maksimal 5 MB
                                </p>
                            </>
                        )}
                        {data.file && (
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="mt-3 text-xs font-semibold text-indigo-600"
                            >
                                Ganti file
                            </button>
                        )}
                    </div>

                    {errors.file && (
                        <p className="mt-2 flex items-start gap-2 text-sm text-rose-600">
                            <i className="fi fi-rr-exclamation mt-0.5" />
                            {errors.file}
                        </p>
                    )}

                    {importErrors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                                <i className="fi fi-rr-triangle-warning" />
                                Import gagal · {importErrors.length} error ditemukan
                            </div>
                            <ul className="scrollbar-thin mt-3 max-h-36 space-y-1.5 overflow-y-auto pr-2 text-xs leading-5 text-rose-700">
                                {importErrors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                            <p className="mt-3 border-t border-rose-200 pt-3 text-xs text-rose-600">
                                Tidak ada data yang disimpan. Perbaiki file lalu import kembali.
                            </p>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !data.file}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <i className={`fi ${processing ? 'fi-rr-spinner animate-spin' : 'fi-rr-upload'}`} />
                        {processing ? 'Mengimport...' : 'Import Produk'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
