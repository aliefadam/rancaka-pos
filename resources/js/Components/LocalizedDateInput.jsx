import { useEffect, useRef, useState } from 'react';

function formatIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');

    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function formatTypedDate(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];

    return parts.filter(Boolean).join('/');
}

function parseDisplayDate(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;

    const [, day, month, year] = match;
    const candidate = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );

    if (
        candidate.getUTCFullYear() !== Number(year) ||
        candidate.getUTCMonth() !== Number(month) - 1 ||
        candidate.getUTCDate() !== Number(day)
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export default function LocalizedDateInput({
    id,
    value,
    onChange,
    min,
    max,
    disabled = false,
    className = '',
}) {
    const pickerRef = useRef(null);
    const [displayValue, setDisplayValue] = useState(() =>
        formatIsoDate(value),
    );

    useEffect(() => {
        setDisplayValue(formatIsoDate(value));
    }, [value]);

    const handleTextChange = (event) => {
        const nextDisplayValue = formatTypedDate(event.target.value);
        const nextValue = parseDisplayDate(nextDisplayValue);

        setDisplayValue(nextDisplayValue);

        if (
            nextValue &&
            (!min || nextValue >= min) &&
            (!max || nextValue <= max)
        ) {
            onChange(nextValue);
        }
    };

    const resetInvalidValue = () => {
        if (parseDisplayDate(displayValue) !== value) {
            setDisplayValue(formatIsoDate(value));
        }
    };

    const openPicker = () => {
        if (disabled) return;

        if (typeof pickerRef.current?.showPicker === 'function') {
            try {
                pickerRef.current.showPicker();
                return;
            } catch {
                // Fall back to a regular click in browsers with partial support.
            }
        }

        pickerRef.current?.click();
    };

    return (
        <div className={`relative ${className}`}>
            <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={displayValue}
                onChange={handleTextChange}
                onBlur={resetInvalidValue}
                disabled={disabled}
                placeholder="DD/MM/YYYY"
                aria-describedby={id ? `${id}-format` : undefined}
                className="block w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                aria-label="Buka kalender"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <i className="fi fi-rr-calendar" />
            </button>
            <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                value={value ?? ''}
                min={min}
                max={max}
                onChange={(event) => onChange(event.target.value)}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
            />
            <span id={id ? `${id}-format` : undefined} className="sr-only">
                Format tanggal, bulan, dan tahun
            </span>
        </div>
    );
}
