function dispatch(name) {
    window.dispatchEvent(new Event(name));
}

export function isPwaInstalled() {
    if (typeof window === 'undefined') return false;

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

export function canInstallPwa() {
    return (
        typeof window !== 'undefined' &&
        Boolean(window.__rancakaPwaInstallPrompt)
    );
}

export async function promptPwaInstall() {
    if (isPwaInstalled()) return 'installed';
    if (!window.__rancakaPwaInstallPrompt) return 'unavailable';

    const prompt = window.__rancakaPwaInstallPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === 'accepted') {
        window.__rancakaPwaInstallPrompt = null;
    }

    return choice.outcome;
}

export function setupPwa() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        window.__rancakaPwaInstallPrompt = event;
        dispatch('rancaka:pwa-install-available');
    });

    window.addEventListener('appinstalled', () => {
        window.__rancakaPwaInstallPrompt = null;
        dispatch('rancaka:pwa-installed');
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // PWA installation remains optional; the web app must still run.
            });
        });
    }
}
