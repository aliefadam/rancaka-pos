import { usePage } from '@inertiajs/react';

export default function usePermission() {
    const { auth } = usePage().props;

    return (permission) => {
        if (auth.user.role !== 'employee') return true;

        return (auth.permissions ?? []).includes(permission);
    };
}
