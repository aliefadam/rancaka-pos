export default function BrandLogo({ className = 'h-10 w-10' }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
            aria-hidden="true"
        >
            <img
                src="/logo.png"
                alt=""
                className="h-full w-full max-w-none scale-[1.3] object-cover"
            />
        </span>
    );
}
