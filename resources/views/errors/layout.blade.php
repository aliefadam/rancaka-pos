<!DOCTYPE html>
<html lang="id-ID">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#0b1220">
    <title>@yield('code') · @yield('title') · {{ config('app.name', 'Rancaka') }}</title>
    <link rel="icon" type="image/png" href="{{ asset('logo.png') }}">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,500,600,700,800&display=swap" rel="stylesheet">
    <script>
        (() => {
            try {
                document.documentElement.dataset.theme = localStorage.getItem('rancaka-theme') === 'dark' ? 'dark' : 'light';
            } catch (_) {
                document.documentElement.dataset.theme = 'light';
            }
        })();
    </script>
    <style>
        :root {
            color-scheme: light;
            --page: #f4f7fb;
            --surface: rgba(255, 255, 255, .88);
            --surface-solid: #fff;
            --ink: #101828;
            --muted: #667085;
            --line: #dfe5ee;
            --accent: #4f46e5;
            --accent-soft: #eef2ff;
            --signal: #34d399;
            --shadow: 0 30px 80px rgba(15, 23, 42, .12);
        }
        :root[data-theme='dark'] {
            color-scheme: dark;
            --page: #060b14;
            --surface: rgba(17, 26, 42, .9);
            --surface-solid: #111a2a;
            --ink: #f8fafc;
            --muted: #a9b6c8;
            --line: #2b3950;
            --accent: #818cf8;
            --accent-soft: rgba(79, 70, 229, .18);
            --signal: #6ee7b7;
            --shadow: 0 32px 90px rgba(0, 0, 0, .42);
        }
        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        body {
            margin: 0;
            background:
                radial-gradient(circle at 15% 12%, color-mix(in srgb, var(--accent) 12%, transparent) 0, transparent 30rem),
                radial-gradient(circle at 88% 88%, color-mix(in srgb, var(--signal) 9%, transparent) 0, transparent 28rem),
                var(--page);
            color: var(--ink);
            font-family: 'Plus Jakarta Sans', ui-sans-serif, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .shell {
            position: relative;
            display: grid;
            min-height: 100vh;
            place-items: center;
            overflow: hidden;
            padding: 32px 20px;
        }
        .grid {
            position: absolute;
            inset: 0;
            background-image:
                linear-gradient(color-mix(in srgb, var(--line) 45%, transparent) 1px, transparent 1px),
                linear-gradient(90deg, color-mix(in srgb, var(--line) 45%, transparent) 1px, transparent 1px);
            background-size: 44px 44px;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,.65), transparent 88%);
            pointer-events: none;
        }
        .card {
            position: relative;
            isolation: isolate;
            width: min(100%, 760px);
            overflow: hidden;
            border: 1px solid var(--line);
            border-radius: 30px;
            background: var(--surface);
            box-shadow: var(--shadow);
            backdrop-filter: blur(18px);
        }
        .card::after {
            position: absolute;
            z-index: -1;
            top: -105px;
            right: -85px;
            width: 270px;
            height: 270px;
            border: 44px solid color-mix(in srgb, var(--accent) 10%, transparent);
            border-radius: 50%;
            content: '';
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 24px 28px;
            border-bottom: 1px solid var(--line);
        }
        .mark {
            display: grid;
            width: 40px;
            height: 40px;
            place-items: center;
            border-radius: 13px;
            background: #4f46e5;
            color: white;
            font-size: 20px;
            font-weight: 800;
            box-shadow: 0 8px 20px rgba(79, 70, 229, .25);
        }
        .brand-name { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.03em; }
        .brand-meta { margin: 2px 0 0; color: var(--muted); font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
        .content { display: grid; gap: 32px; padding: 46px 46px 42px; grid-template-columns: 180px 1fr; align-items: center; }
        .code-wrap { position: relative; display: grid; min-height: 164px; place-items: center; }
        .code-ring {
            position: absolute;
            width: 150px;
            height: 150px;
            border: 1px dashed color-mix(in srgb, var(--accent) 38%, var(--line));
            border-radius: 50%;
            animation: orbit 24s linear infinite;
        }
        .code-ring::before { position: absolute; top: 13px; left: 17px; width: 9px; height: 9px; border-radius: 50%; background: var(--signal); box-shadow: 0 0 0 6px color-mix(in srgb, var(--signal) 14%, transparent); content: ''; }
        .code { position: relative; margin: 0; color: var(--accent); font-size: clamp(54px, 9vw, 82px); font-weight: 800; letter-spacing: -.09em; line-height: 1; }
        .eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0; color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .eyebrow::before { width: 7px; height: 7px; border-radius: 50%; background: var(--signal); content: ''; }
        h1 { margin: 12px 0 0; font-size: clamp(27px, 4vw, 38px); font-weight: 800; letter-spacing: -.045em; line-height: 1.14; }
        .message { max-width: 470px; margin: 14px 0 0; color: var(--muted); font-size: 15px; line-height: 1.75; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
        .button {
            display: inline-flex;
            min-height: 44px;
            align-items: center;
            justify-content: center;
            gap: 9px;
            border: 1px solid var(--line);
            border-radius: 13px;
            padding: 0 17px;
            background: var(--surface-solid);
            color: var(--ink);
            font-size: 13px;
            font-weight: 800;
            text-decoration: none;
            transition: transform .18s ease, border-color .18s ease, background .18s ease;
            cursor: pointer;
        }
        .button:hover { transform: translateY(-2px); border-color: var(--accent); }
        .button-primary { border-color: #4f46e5; background: #4f46e5; color: white; box-shadow: 0 10px 24px rgba(79, 70, 229, .25); }
        .button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
        .foot { display: flex; justify-content: space-between; gap: 20px; padding: 17px 28px; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        @keyframes orbit { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .code-ring { animation: none; } .button { transition: none; } }
        @media (max-width: 680px) {
            .content { grid-template-columns: 1fr; gap: 8px; padding: 32px 25px 30px; }
            .code-wrap { min-height: 128px; place-items: start; align-items: center; }
            .code-ring { left: -15px; width: 120px; height: 120px; }
            .code { margin-left: 11px; }
            .actions { flex-direction: column; }
            .button { width: 100%; }
            .foot { align-items: flex-start; flex-direction: column; gap: 5px; }
        }
    </style>
</head>
<body>
    @php
        $isAuthenticated = auth()->check();
        $homeUrl = route('home');
    @endphp
    <main class="shell">
        <div class="grid" aria-hidden="true"></div>
        <article class="card" aria-labelledby="error-title">
            <header class="brand">
                <span class="mark" aria-hidden="true">R</span>
                <div>
                    <p class="brand-name">Rancaka</p>
                    <p class="brand-meta">Point of Sale</p>
                </div>
            </header>

            <div class="content">
                <div class="code-wrap" aria-hidden="true">
                    <span class="code-ring"></span>
                    <p class="code">@yield('code')</p>
                </div>
                <div>
                    <p class="eyebrow">Terjadi kendala</p>
                    <h1 id="error-title">@yield('title')</h1>
                    <p class="message">@yield('message')</p>
                    <div class="actions">
                        <a class="button button-primary" href="{{ $homeUrl }}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10v10h13V10"></path><path d="M9.5 20v-6h5v6"></path></svg>
                            {{ $isAuthenticated ? 'Ke Dashboard' : 'Ke Beranda' }}
                        </a>
                        <button class="button" type="button" onclick='if (history.length > 1) { history.back(); } else { location.href = @js($homeUrl); }'>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                            Kembali
                        </button>
                    </div>
                </div>
            </div>

            <footer class="foot">
                <span>Error @yield('code')</span>
                <span>{{ now()->format('d M Y · H:i') }} WIB</span>
            </footer>
        </article>
    </main>
</body>
</html>
