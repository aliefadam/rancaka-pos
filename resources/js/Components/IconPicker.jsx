import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
} from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';

export const CATEGORY_ICONS = [
    'fi-rr-bowl-rice',
    'fi-rr-cup',
    'fi-rr-cookie',
    'fi-rr-coffee',
    'fi-rr-ice-cream',
    'fi-rr-milkshake',
    'fi-rr-pizza-slice',
    'fi-rr-burger',
    'fi-rr-hotdog',
    'fi-rr-bread-slice',
    'fi-rr-cheese',
    'fi-rr-egg',
    'fi-rr-soup',
    'fi-rr-noodles',
    'fi-rr-apple-whole',
    'fi-rr-carrot',
    'fi-rr-fish',
    'fi-rr-drumstick',
    'fi-rr-candy',
    'fi-rr-wine-glass',
    'fi-rr-beer',
    'fi-rr-shopping-bag',
    'fi-rr-box',
    'fi-rr-tags',
    'fi-rr-shapes',
];

export default function IconPicker({
    value,
    onChange,
    options = CATEGORY_ICONS,
    placeholder = 'Pilih icon',
    className = '',
}) {
    const [query, setQuery] = useState('');

    const filteredOptions = useMemo(() => {
        if (!query.trim()) return options;

        const q = query.toLowerCase();
        return options.filter((option) => option.toLowerCase().includes(q));
    }, [options, query]);

    return (
        <div className={className}>
            <Listbox value={value} onChange={onChange}>
                <div className="relative">
                    <ListboxButton className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                        <span className="flex items-center gap-2 truncate">
                            {value ? (
                                <i className={`fi ${value} text-indigo-600`} />
                            ) : null}
                            <span
                                className={
                                    value
                                        ? 'truncate text-slate-900'
                                        : 'truncate text-slate-400'
                                }
                            >
                                {value || placeholder}
                            </span>
                        </span>
                        <i className="fi fi-sr-angle-small-down shrink-0 text-xs text-slate-400" />
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
                                        placeholder="Cari icon..."
                                        className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </div>

                            {filteredOptions.length === 0 && (
                                <p className="px-3 py-2 text-sm text-slate-400">
                                    Tidak ada hasil.
                                </p>
                            )}

                            {filteredOptions.map((icon) => (
                                <ListboxOption
                                    key={icon}
                                    value={icon}
                                    className={({ focus }) =>
                                        `flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                                            focus
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'text-slate-700'
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                                                <i
                                                    className={`fi ${icon} ${selected ? 'text-indigo-600' : 'text-slate-500'}`}
                                                />
                                            </span>
                                            <span
                                                className={`truncate ${selected ? 'font-medium' : ''}`}
                                            >
                                                {icon}
                                            </span>
                                            {selected && (
                                                <i className="fi fi-sr-check ml-auto text-indigo-600" />
                                            )}
                                        </>
                                    )}
                                </ListboxOption>
                            ))}
                        </ListboxOptions>
                    </Transition>
                </div>
            </Listbox>

            {value && (
                <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-2xl text-indigo-600">
                    <i className={`fi ${value}`} />
                </div>
            )}
        </div>
    );
}
