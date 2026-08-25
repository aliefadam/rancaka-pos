function formatMoneyValue(value) {
    if (value === '' || value === null || value === undefined) return '';

    const number = Number(value);
    if (!Number.isFinite(number)) return '';

    return Math.trunc(number).toLocaleString('id-ID');
}

export default function MoneyInput({
    value,
    onValueChange,
    className = '',
    min,
    max,
    ...props
}) {
    const handleChange = (event) => {
        const digits = event.target.value.replace(/\D/g, '');

        if (digits === '') {
            onValueChange('');
            return;
        }

        let nextValue = digits.replace(/^0+(?=\d)/, '');
        const numericMax = Number(max);

        if (max !== undefined && Number.isFinite(numericMax)) {
            nextValue = String(Math.min(Number(nextValue), numericMax));
        }

        onValueChange(nextValue);
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            value={formatMoneyValue(value)}
            onChange={handleChange}
            className={className}
        />
    );
}
