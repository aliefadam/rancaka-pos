export default function BrandLogo({ className = 'h-9 w-9' }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
            aria-hidden="true"
        >
            <img
                src="/logo.png"
                alt=""
                className="h-full w-full object-contain"
            />
        </span>
    );
}
