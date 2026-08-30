import { usePage } from '@inertiajs/react';

export default function BrandLogo({ className = 'h-9 w-9' }) {
    const branding = usePage().props.branding ?? {};
    const lightLogo = branding.light_logo_url || '/logo.png';
    const whiteLogo = branding.white_logo_url || lightLogo;

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
            aria-hidden="true"
        >
            <img
                src={lightLogo}
                alt=""
                className="h-full w-full object-contain dark:hidden"
            />
            <img
                src={whiteLogo}
                alt=""
                className="hidden h-full w-full object-contain dark:block"
            />
        </span>
    );
}
