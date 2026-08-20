import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
} from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';

export default function Select({
    value,
    onChange,
    options,
    placeholder = 'Pilih...',
    searchable = false,
    searchPlaceholder = 'Cari...',
    onCreateOption,
    createLabel = (query) => `Tambah “${query}”`,
    className = '',
}) {
    const [query, setQuery] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchable || !query.trim()) return options;

        const q = query.toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(q),
        );
    }, [options, query, searchable]);

    const selected = options.find((option) => option.value === value);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className={`relative ${className}`}>
                <ListboxButton className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <span
                        className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                        {selected ? selected.label : placeholder}
                    </span>
                    <i className="fi fi-rr-angle-small-down shrink-0 text-xs text-slate-400" />
                </ListboxButton>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-150"
                    enterFrom="opacity-0 -translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-1"
                    afterLeave={() => setQuery('')}
                >
                    <ListboxOptions
                        anchor={{ to: 'bottom start', gap: 8 }}
                        className="scrollbar-thin z-[100] w-[var(--button-width)] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/60 focus:outline-none"
                    >
                        {searchable && (
                            <div className="sticky top-0 z-10 mb-1 bg-white pb-1.5">
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                                        <i className="fi fi-rr-search text-xs" />
                                    </span>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) =>
                                            setQuery(e.target.value)
                                        }
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder={searchPlaceholder}
                                        className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </div>
                        )}

                        {filteredOptions.length === 0 && (
                            onCreateOption && query.trim() ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onCreateOption(query.trim());
                                        setQuery('');
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                                >
                                    <i className="fi fi-rr-plus-small" />
                                    {createLabel(query.trim())}
                                </button>
                            ) : (
                                <p className="px-3 py-2 text-sm text-slate-400">
                                    Tidak ada hasil.
                                </p>
                            )
                        )}

                        {filteredOptions.map((option) => (
                            <ListboxOption
                                key={option.value}
                                value={option.value}
                                className={({ focus }) =>
                                    `flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                                        focus
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-700'
                                    }`
                                }
                            >
                                {({ selected }) => (
                                    <>
                                        <span
                                            className={
                                                selected
                                                    ? 'font-medium'
                                                    : ''
                                            }
                                        >
                                            {option.label}
                                        </span>
                                        {selected && (
                                            <i className="fi fi-rr-check text-indigo-600" />
                                        )}
                                    </>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </Transition>
            </div>
        </Listbox>
    );
}
