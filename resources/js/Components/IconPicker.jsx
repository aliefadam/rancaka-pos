export const CATEGORY_ICONS = [
    'fi-rr-bowl-rice',
    'fi-rr-cup-togo',
    'fi-rr-cookie',
    'fi-rr-coffee',
    'fi-rr-ice-cream',
    'fi-rr-drink-alt',
    'fi-rr-pizza-slice',
    'fi-rr-hamburger',
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
    'fi-rr-wine-bottle',
    'fi-rr-beer',
    'fi-rr-shopping-bag',
    'fi-rr-box',
    'fi-rr-tags',
    'fi-rr-square',
];

export default function IconPicker({
    value,
    onChange,
    options = CATEGORY_ICONS,
    className = '',
}) {
    const availableIcons = value && !options.includes(value)
        ? [value, ...options]
        : options;

    return (
        <div
            className={`grid grid-cols-5 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-7 ${className}`}
            role="radiogroup"
            aria-label="Pilihan ikon kategori"
        >
            {availableIcons.map((icon, index) => {
                const selected = value === icon;

                return (
                    <button
                        key={icon}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`Pilih ikon kategori ${index + 1}`}
                        onClick={() => onChange(icon)}
                        className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl border text-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 ${
                            selected
                                ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'
                        }`}
                    >
                        <i className={`fi ${icon}`} />
                        {selected && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white ring-2 ring-indigo-400" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
