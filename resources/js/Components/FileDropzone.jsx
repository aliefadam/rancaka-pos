import { useRef, useState } from 'react';

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return '';

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toLocaleString('id-ID', {
            maximumFractionDigits: 1,
        })} KB`;
    }

    return `${(bytes / (1024 * 1024)).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
    })} MB`;
}

function acceptsFile(file, accept) {
    if (!accept) return true;

    return accept.split(',').some((rule) => {
        const value = rule.trim().toLowerCase();

        if (value.startsWith('.')) {
            return file.name.toLowerCase().endsWith(value);
        }

        if (value.endsWith('/*')) {
            return file.type.toLowerCase().startsWith(value.slice(0, -1));
        }

        return file.type.toLowerCase() === value;
    });
}

export default function FileDropzone({
    label,
    required = false,
    file,
    onFileChange,
    accept,
    helperText,
    error,
    maxSize,
    maxSizeByType = {},
    variant = 'light',
    disabled = false,
}) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState('');
    const dark = variant === 'dark';

    const chooseFile = (nextFile) => {
        setLocalError('');

        if (!nextFile) return;

        if (!acceptsFile(nextFile, accept)) {
            setLocalError('Format file tidak didukung.');
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const sizeLimit = maxSizeByType[nextFile.type] ?? maxSize;
        if (sizeLimit && nextFile.size > sizeLimit) {
            setLocalError(`Ukuran file maksimal ${formatFileSize(sizeLimit)}.`);
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        onFileChange(nextFile);
    };

    const openPicker = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.click();
        }
    };

    const removeFile = () => {
        onFileChange(null);
        setLocalError('');
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div>
            {label && (
                <p className={`mb-1.5 text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {label} {required && <span className="text-rose-500">*</span>}
                </p>
            )}

            <div
                onDragEnter={(event) => {
                    event.preventDefault();
                    if (!disabled) setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setDragging(false);
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!disabled) chooseFile(event.dataTransfer.files?.[0]);
                }}
                className={`overflow-hidden rounded-xl border-2 border-dashed transition ${
                    dragging
                        ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30'
                        : dark
                          ? 'border-slate-700 bg-slate-800/50'
                          : 'border-slate-200 bg-slate-50/60'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    disabled={disabled}
                    className="hidden"
                    onChange={(event) => chooseFile(event.target.files?.[0])}
                />

                {file ? (
                    <div className="flex items-center gap-3 p-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'bg-slate-700 text-indigo-300' : 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'}`}>
                            <i className={`fi ${file.type === 'application/pdf' ? 'fi-rr-file-pdf' : 'fi-rr-file-image'}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                                {file.name}
                            </p>
                            <p className={`mt-0.5 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatFileSize(file.size)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openPicker}
                            className={`hidden rounded-lg px-2.5 py-2 text-xs font-semibold sm:block ${dark ? 'text-indigo-300 hover:bg-slate-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            Ganti
                        </button>
                        <button
                            type="button"
                            onClick={removeFile}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? 'text-rose-300 hover:bg-slate-700' : 'text-rose-500 hover:bg-rose-50'}`}
                            aria-label={`Hapus ${file.name}`}
                        >
                            <i className="fi fi-rr-trash" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={openPicker}
                        disabled={disabled}
                        className="flex w-full items-center gap-3 p-3 text-left sm:p-4"
                    >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'bg-slate-700 text-indigo-300' : 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'}`}>
                            <i className="fi fi-rr-cloud-upload-alt" />
                        </span>
                        <span className="min-w-0">
                            <span className={`block text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Pilih atau jatuhkan file
                            </span>
                            <span className={`mt-0.5 block text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {helperText}
                            </span>
                        </span>
                    </button>
                )}
            </div>

            {(localError || error) && (
                <p className="mt-1.5 text-xs text-rose-500">{localError || error}</p>
            )}
        </div>
    );
}
