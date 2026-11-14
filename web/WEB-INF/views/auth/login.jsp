<%@page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Sign In - Smart Misting IoT System</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/fontawesome.min.css">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #08090b;
            color: #0f172a;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow: hidden;
            position: relative;
            transition: background-color 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        body::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 30% 45%, #16181d 0%, #0c0d10 55%, #060708 100%);
            z-index: 0;
            pointer-events: none;
            transition: opacity 0.9s ease;
        }

        body::after {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 26% 24%, #f1f7fc 0%, #dfeaf4 45%, #cedee9 82%, #bfd3e2 100%);
            opacity: 0;
            z-index: 1;
            pointer-events: none;
            transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        body.mist-on::after {
            opacity: 1;
        }

        .ambient-mist-bridge {
            position: absolute;
            width: 980px;
            height: 520px;
            background: radial-gradient(ellipse 65% 55% at 44% 48%,
                rgba(56, 189, 248, 0.22) 0%,
                rgba(16, 185, 129, 0.12) 45%,
                rgba(255, 255, 255, 0) 75%);
            filter: blur(28px);
            opacity: 0;
            pointer-events: none;
            z-index: 2;
            transition: opacity 0.9s ease;
        }

        body.mist-on .ambient-mist-bridge {
            opacity: 1;
        }

        .stage-layout {
            width: 100%;
            max-width: 1000px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 34px;
            position: relative;
            z-index: 5;
        }

        #interactiveBridgeCanvas {
            position: absolute;
            inset: -40px;
            width: calc(100% + 80px);
            height: calc(100% + 80px);
            pointer-events: none;
            z-index: 7;
        }

        .terrarium-pod {
            position: relative;
            width: 470px;
            height: 500px;
            border-radius: 24px;

            background: linear-gradient(180deg,
                rgba(24, 26, 31, 0.92) 0%,
                rgba(15, 17, 21, 0.96) 68%,
                rgba(10, 11, 14, 0.99) 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1.5px solid rgba(255, 255, 255, 0.1);
            border-top: 1.5px solid rgba(255, 255, 255, 0.22);
            box-shadow:
                0 28px 56px -12px rgba(0, 0, 0, 0.9),
                inset 0 1px 2px rgba(255, 255, 255, 0.12),
                inset 0 -12px 28px rgba(0, 0, 0, 0.6);
            overflow: hidden;
            flex-shrink: 0;
            cursor: pointer;
            user-select: none;
            z-index: 5;
            transition:
                background 0.85s cubic-bezier(0.16, 1, 0.3, 1),
                border-color 0.85s ease,
                box-shadow 0.85s ease,
                transform 0.25s ease;
        }

        .terrarium-pod:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.24);
        }

        body.mist-on .terrarium-pod {
            background: linear-gradient(180deg,
                rgba(235, 245, 252, 0.94) 0%,
                rgba(220, 237, 248, 0.88) 58%,
                rgba(205, 229, 244, 0.94) 100%);
            border: 2px solid #ffffff;
            box-shadow:
                0 28px 55px -12px rgba(15, 23, 42, 0.18),
                16px 0 40px -10px rgba(2, 132, 199, 0.18),
                inset 0 2px 10px #ffffff,
                inset 0 -10px 24px rgba(2, 132, 199, 0.1);
        }

        .terrarium-glass-reflection {
            position: absolute;
            inset: 0;
            background: linear-gradient(130deg,
                rgba(255, 255, 255, 0.12) 0%,
                rgba(255, 255, 255, 0.02) 32%,
                transparent 50%,
                rgba(255, 255, 255, 0.06) 100%);
            pointer-events: none;
            z-index: 6;
        }

        .led-sunbeam {
            position: absolute;
            top: 22px;
            left: 20px;
            width: 230px;
            height: 340px;
            background: radial-gradient(ellipse at 50% 0%,
                rgba(253, 224, 71, 0.45) 0%,
                rgba(254, 240, 138, 0.22) 52%,
                transparent 78%);
            opacity: 0;
            transition: opacity 0.7s ease;
            pointer-events: none;
            z-index: 2;
        }

        body.mist-on .led-sunbeam {
            opacity: 1;
        }

        .nozzle-mist-cone {
            position: absolute;
            top: 72px;
            left: 235px;
            transform: translateX(-50%) scale(0.75);
            transform-origin: top center;
            width: 380px;
            height: 350px;
            background: radial-gradient(ellipse 55% 85% at 50% 0%,
                rgba(2, 132, 199, 0.34) 0%,
                rgba(14, 165, 233, 0.2) 45%,
                rgba(56, 189, 248, 0.08) 75%,
                transparent 100%);
            clip-path: polygon(43% 0%, 57% 0%, 100% 100%, 0% 100%);
            filter: blur(6px);
            opacity: 0;
            transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            z-index: 2;
        }

        body.mist-on .nozzle-mist-cone {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }

        .hardware-header-svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150px;
            z-index: 5;
            pointer-events: none;
        }

        .roof-wood-bar {
            fill: #1e2026;
            transition: fill 0.8s ease;
        }
        body.mist-on .roof-wood-bar {
            fill: #cfa574;
        }

        .led-lamp-tube {
            fill: #282b33;
            transition: fill 0.5s ease, filter 0.5s ease;
        }
        body.mist-on .led-lamp-tube {
            fill: #fde047;
            filter: drop-shadow(0 4px 10px rgba(234, 179, 8, 0.9));
        }

        .pipe-outer-wall {
            stroke: rgba(255, 255, 255, 0.18);
            transition: stroke 0.7s ease;
        }
        body.mist-on .pipe-outer-wall {
            stroke: rgba(15, 23, 42, 0.25);
        }

        .pipe-inner-wall {
            stroke: rgba(255, 255, 255, 0.08);
            transition: stroke 0.7s ease;
        }
        body.mist-on .pipe-inner-wall {
            stroke: rgba(255, 255, 255, 0.92);
        }

        .pipe-water-core {
            stroke: rgba(30, 35, 45, 0.5);
            transition: stroke 0.5s ease;
        }
        body.mist-on .pipe-water-core {
            stroke: #0284c7;
            stroke-dasharray: 12 6;
            animation: waterFlowAnim 0.5s linear infinite;
        }

        @keyframes waterFlowAnim {
            to { stroke-dashoffset: -18; }
        }

        .nozzle-housing {
            fill: #252830;
            stroke: #3f4452;
            transition: fill 0.7s ease, stroke 0.7s ease;
        }
        body.mist-on .nozzle-housing {
            fill: #ffffff;
            stroke: #64748b;
        }

        .nozzle-ring-indicator {
            stroke: #525866;
            opacity: 0.6;
            transition: opacity 0.4s ease, stroke 0.4s ease;
        }
        body.mist-on .nozzle-ring-indicator {
            stroke: #0284c7;
            opacity: 1;
        }

        #terrariumCanvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 4;
            pointer-events: none;
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            padding: 38px 34px;

            background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.9) 0%,
                rgba(248, 252, 255, 0.8) 55%,
                rgba(240, 249, 255, 0.86) 100%);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            border: 1.5px solid #ffffff;
            border-left: 2.5px solid #ffffff;
            border-top: 2px solid #ffffff;
            border-radius: 20px;
            box-shadow:
                0 25px 50px -12px rgba(15, 23, 42, 0.16),
                -12px 0 32px -8px rgba(2, 132, 199, 0.15),
                inset 0 2px 4px #ffffff,
                inset 0 -1px 2px rgba(148, 163, 184, 0.25);
            position: relative;
            z-index: 6;
            overflow: hidden;

            opacity: 0;
            transform: translateX(-18px) scale(0.96);
            filter: blur(8px);
            pointer-events: none;
            transition:
                opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                filter 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.65s ease;
        }

        body.mist-on .login-card {
            opacity: 1;
            transform: translateX(0) scale(1);
            filter: blur(0px);
            pointer-events: auto;
        }

        .login-card::before {
            content: '';
            position: absolute;
            top: -20%;
            left: -25%;
            width: 65%;
            height: 140%;
            background: radial-gradient(circle, rgba(186, 230, 253, 0.4) 0%, rgba(167, 243, 208, 0.18) 45%, transparent 75%);
            pointer-events: none;
            z-index: 0;
        }

        .glass-dew {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #bae6fd 55%, rgba(2, 132, 199, 0.4) 100%);
            box-shadow:
                0 2px 4px rgba(15, 23, 42, 0.16),
                inset 0 1px 1px #ffffff;
            pointer-events: none;
            z-index: 1;
            opacity: 0;
            transform: scale(0.4);
            transition: opacity 0.8s ease 0.35s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s;
        }

        body.mist-on .glass-dew {
            opacity: 0.9;
            transform: scale(1);
        }

        .dew-1 { width: 7px; height: 7px; top: 24px; left: 16px; }
        .dew-2 { width: 5px; height: 5px; top: 42px; left: 28px; transition-delay: 0.5s; }
        .dew-3 { width: 8px; height: 9px; bottom: 65px; left: 14px; transition-delay: 0.65s; }
        .dew-4 { width: 5px; height: 5px; top: 28px; right: 32px; transition-delay: 0.55s; }

        .login-card-content {
            position: relative;
            z-index: 2;
        }

        .logo-wrap {
            text-align: center;
            margin-bottom: 26px;
        }

        .app-icon-circle {
            width: 60px;
            height: 60px;
            background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1.5px solid #6ee7b7;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #059669;
            font-size: 1.7rem;
            margin-bottom: 12px;
            box-shadow:
                0 6px 16px rgba(16, 185, 129, 0.18),
                inset 0 1px 2px #ffffff;
        }

        .login-title {
            font-size: 1.45rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
            margin-bottom: 4px;
        }

        .login-subtitle {
            font-size: 0.86rem;
            color: #475569;
            font-weight: 500;
            line-height: 1.4;
        }

        .alert-error {
            background: rgba(254, 242, 242, 0.95);
            border-left: 4px solid #ef4444;
            border-radius: 6px;
            padding: 10px 14px;
            color: #991b1b;
            font-size: 0.84rem;
            font-weight: 500;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .input-group-box {
            margin-bottom: 18px;
        }

        .input-group-box label {
            display: block;
            font-size: 0.84rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 6px;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 14px;
            color: #64748b;
            font-size: 0.95rem;
            pointer-events: none;
            z-index: 3;
            transition: color 0.2s;
        }

        .form-input {
            position: relative;
            z-index: 1;
            width: 100%;
            padding: 11px 14px 11px 38px;
            background: rgba(255, 255, 255, 0.92);
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            color: #0f172a;
            font-family: inherit;
            font-size: 0.94rem;
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .form-input::placeholder {
            color: #94a3b8;
        }

        .form-input:focus {
            background: #ffffff;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
        }

        .input-wrapper:focus-within .input-icon {
            color: #10b981;
        }

        .btn-submit-container {
            display: flex;
            justify-content: center;
            margin-top: 22px;
        }

        .btn-submit {
            width: 35%;
            min-width: 120px;
            padding: 10px 16px;
            background: #10b981;
            border: none;
            border-radius: 8px;
            color: #ffffff;
            font-family: inherit;
            font-size: 0.94rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .btn-submit:hover {
            background: #059669;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.38);
        }

        .btn-submit:active {
            transform: translateY(1px);
        }

        @media (max-width: 920px) {
            body {
                overflow-y: auto;
            }
            .stage-layout {
                flex-direction: column;
                gap: 24px;
            }
            .terrarium-pod {
                width: 100%;
                max-width: 440px;
                height: 430px;
            }
        }

</style>
</head>
<body class="${(not empty errorMessage or not empty param.error) ? 'mist-on' : ''}">

    <div class="ambient-mist-bridge"></div>

    <div class="stage-layout">

        <canvas id="interactiveBridgeCanvas"></canvas>

        <div class="terrarium-pod" id="terrariumTrigger">
            <div class="terrarium-glass-reflection"></div>
            <div class="led-sunbeam"></div>
            <div class="nozzle-mist-cone"></div>

            <svg class="hardware-header-svg" viewBox="0 0 470 150" xmlns="http://www.w3.org/2000/svg">

                <rect x="0" y="0" width="470" height="16" class="roof-wood-bar" />
                <line x1="0" y1="16" x2="470" y2="16" stroke="rgba(0,0,0,0.22)" stroke-width="1.5" />

                <rect x="38" y="16" width="140" height="7" rx="2" fill="#3f4452" />
                <rect x="46" y="23" width="124" height="6" rx="3" class="led-lamp-tube" />

                <path d="M 475 128 Q 368 52 266 47" fill="none" class="pipe-outer-wall" stroke-width="14" stroke-linecap="round" />
                <path d="M 475 128 Q 368 52 266 47" fill="none" class="pipe-inner-wall" stroke-width="11" stroke-linecap="round" />
                <path d="M 475 128 Q 368 52 266 47" fill="none" class="pipe-water-core" stroke-width="7" stroke-linecap="round" />

                <rect x="255" y="40" width="14" height="14" rx="3" class="nozzle-housing" stroke-width="1.4" />

                <rect x="228" y="16" width="14" height="12" fill="#475569" />
                <rect x="209" y="26" width="52" height="44" rx="9" class="nozzle-housing" stroke-width="1.6" />
                <line x1="216" y1="48" x2="254" y2="48" class="nozzle-ring-indicator" stroke-width="2.5" stroke-linecap="round" />

                <rect x="217" y="69" width="36" height="4" rx="2" fill="#0284c7" />
            </svg>

            <canvas id="terrariumCanvas"></canvas>
        </div>

        <div class="login-card">
            <span class="glass-dew dew-1"></span>
            <span class="glass-dew dew-2"></span>
            <span class="glass-dew dew-3"></span>
            <span class="glass-dew dew-4"></span>

            <div class="login-card-content">
                <div class="logo-wrap">
                    <div class="app-icon-circle">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <h1 class="login-title">Smart Misting</h1>
                    <p class="login-subtitle">Automated Irrigation &amp; Soil Monitoring System</p>
                </div>

                <c:choose>
                    <c:when test="${param.error eq 'account_locked'}">
                        <div class="alert-error">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span>Your account has been locked. Please contact the system administrator.</span>
                        </div>
                    </c:when>
                    <c:when test="${not empty errorMessage}">
                        <div class="alert-error">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span>${errorMessage}</span>
                        </div>
                    </c:when>
                </c:choose>

                <form action="${pageContext.request.contextPath}/login" method="post" id="loginForm">
                    <div class="input-group-box">
                        <label for="usernameInput">Username</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-user input-icon"></i>
                            <input type="text" id="usernameInput" class="form-input" name="username" placeholder="Enter username..." required autocomplete="username">
                        </div>
                    </div>

                    <div class="input-group-box">
                        <label for="passwordInput">Password</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-lock input-icon"></i>
                            <input type="password" id="passwordInput" class="form-input" name="password" placeholder="Enter password..." required autocomplete="current-password">
                        </div>
                    </div>

                    <div class="btn-submit-container">
                        <button type="submit" class="btn-submit">Sign In</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        (function () {
            const body = document.body;
            const terrariumTrigger = document.getElementById('terrariumTrigger');
            const usernameInput = document.getElementById('usernameInput');

            const tCanvas = document.getElementById('terrariumCanvas');
            const tCtx = tCanvas.getContext('2d');
            const W = 470;
            const H = 500;
            const dpr = window.devicePixelRatio || 1;
            tCanvas.width = W * dpr;
            tCanvas.height = H * dpr;
            tCtx.scale(dpr, dpr);

            const bCanvas = document.getElementById('interactiveBridgeCanvas');
            const bCtx = bCanvas.getContext('2d');
            const BW = 1080;
            const BH = 580;
            bCanvas.width = BW * dpr;
            bCanvas.height = BH * dpr;
            bCtx.scale(dpr, dpr);

            let isMisting = body.classList.contains('mist-on');
            let hydration = isMisting ? 1.0 : 0.0;
            let tick = 0;

            function lerp(a, b, t) {
                return a + (b - a) * t;
            }

            function mixRGB(r1, g1, b1, r2, g2, b2, t) {
                const r = Math.round(lerp(r1, r2, t));
                const g = Math.round(lerp(g1, g2, t));
                const b = Math.round(lerp(b1, b2, t));
                return 'rgb(' + r + ',' + g + ',' + b + ')';
            }

            const broadPlants = [
                { x: 65,  y: 442, scale: 0.92, angle: -0.36, phase: 0.3 },
                { x: 115, y: 438, scale: 1.12, angle: -0.14, phase: 1.2 },
                { x: 165, y: 441, scale: 1.24, angle: 0.06,  phase: 2.1 },
                { x: 212, y: 436, scale: 1.30, angle: -0.10, phase: 0.8 },
                { x: 255, y: 438, scale: 1.26, angle: 0.15,  phase: 1.7 },
                { x: 305, y: 440, scale: 1.16, angle: -0.06, phase: 2.6 },
                { x: 355, y: 439, scale: 1.10, angle: 0.20,  phase: 0.5 },
                { x: 405, y: 442, scale: 0.90, angle: 0.34,  phase: 1.8 }
            ];

            const grassBlades = [];
            const TOTAL_GRASS = 340;
            for (let i = 0; i < TOTAL_GRASS; i++) {
                const layer = i < 110 ? 0 : (i < 225 ? 1 : 2);
                const x = 8 + (i / TOTAL_GRASS) * (W - 16) + (Math.random() - 0.5) * 8;
                const h = (layer === 0 ? 66 : (layer === 1 ? 86 : 106)) + Math.random() * 50;
                const curve = (Math.random() - 0.5) * 36;
                const w = layer === 0 ? 2.5 : (layer === 1 ? 3.3 : 4.1);

                grassBlades.push({
                    x: x,
                    baseY: 444 + layer * 3,
                    h: h,
                    curve: curve,
                    w: w,
                    layer: layer,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.018 + Math.random() * 0.014,
                    hasDew: Math.random() > 0.68
                });
            }

            const WATER_HEX = ['#0369A1', '#0284C7', '#0EA5E9', '#38BDF8', '#7DD3FC'];
            const sprayDrops = [];
            const splashes = [];
            const bridgeMist = [];

            function createSprayDrop() {
                const startX = 218 + Math.random() * 34;
                const spread = (Math.random() - 0.5) * 0.92;
                const speed = 2.8 + Math.random() * 3.4;
                const isMist = Math.random() > 0.45;
                const color = WATER_HEX[Math.floor(Math.random() * WATER_HEX.length)];

                return {
                    x: startX,
                    y: 73,
                    vx: Math.sin(spread) * speed,
                    vy: Math.cos(spread) * speed,
                    size: isMist ? (1.5 + Math.random() * 1.5) : (2.1 + Math.random() * 1.3),
                    alpha: isMist ? (0.5 + Math.random() * 0.35) : (0.85 + Math.random() * 0.15),
                    isMist: isMist,
                    color: color
                };
            }

            function createBridgeParticle() {
                return {
                    x: 260 + Math.random() * 160,
                    y: 120 + Math.random() * 260,
                    vx: 0.85 + Math.random() * 1.4,
                    vy: (Math.random() - 0.45) * 0.6,
                    r: 1.4 + Math.random() * 2.2,
                    alpha: 0.0,
                    maxAlpha: 0.45 + Math.random() * 0.35,
                    color: Math.random() > 0.4 ? '#0284C7' : '#38BDF8'
                };
            }

            function draw3DChamberLines(t) {
                tCtx.save();
                tCtx.strokeStyle = t > 0.5 ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.05)';
                tCtx.lineWidth = 1.2;
                tCtx.strokeRect(26, 32, W - 52, 392);

                tCtx.beginPath();
                tCtx.moveTo(0, 16); tCtx.lineTo(26, 32);
                tCtx.moveTo(W, 16); tCtx.lineTo(W - 26, 32);
                tCtx.moveTo(0, 440); tCtx.lineTo(26, 424);
                tCtx.moveTo(W, 440); tCtx.lineTo(W - 26, 424);
                tCtx.stroke();
                tCtx.restore();
            }

            function drawPlantCluster(plant, t) {
                const sway = Math.sin(tick * 0.022 + plant.phase) * 0.045;
                const wilt = (1 - t) * 0.18;

                const leafMain = mixRGB(92, 98, 52, 16, 185, 129, t);
                const leafShadow = mixRGB(68, 74, 38, 5, 150, 105, t);
                const veinColor = mixRGB(132, 140, 76, 167, 243, 208, t);

                const leaves = [
                    { dx: -17, dy: -10, rot: -0.44, len: 50 },
                    { dx: 17,  dy: -12, rot: 0.42,  len: 48 },
                    { dx: 0,   dy: -20, rot: 0.02,  len: 62 }
                ];

                for (let i = 0; i < leaves.length; i++) {
                    const lf = leaves[i];
                    const len = lf.len * plant.scale * lerp(0.88, 1.05, t);
                    const rot = plant.angle + lf.rot + sway + (lf.rot >= 0 ? wilt : -wilt);

                    tCtx.save();
                    tCtx.globalAlpha = 1.0;
                    tCtx.translate(plant.x + lf.dx, plant.y + lf.dy);
                    tCtx.rotate(rot);

                    tCtx.beginPath();
                    tCtx.moveTo(0, 0);
                    tCtx.bezierCurveTo(-len * 0.42, -len * 0.28, -len * 0.36, -len * 0.78, 0, -len);
                    tCtx.bezierCurveTo(len * 0.36, -len * 0.78, len * 0.42, -len * 0.28, 0, 0);
                    tCtx.fillStyle = i === 2 ? leafMain : leafShadow;
                    tCtx.fill();

                    tCtx.beginPath();
                    tCtx.moveTo(0, -4);
                    tCtx.quadraticCurveTo(len * 0.02, -len * 0.5, 0, -len * 0.88);
                    tCtx.strokeStyle = veinColor;
                    tCtx.lineWidth = 1.2;
                    tCtx.lineCap = 'round';
                    tCtx.stroke();

                    tCtx.restore();
                }
            }

            function drawGrass(b, t) {
                const sway = Math.sin(tick * b.speed + b.phase) * (3.2 + t * 2.6);
                const h = b.h * lerp(0.8, 1.06, t);
                const lean = b.curve * lerp(1.38, 0.82, t) + sway;

                const tipX = b.x + lean;
                const tipY = b.baseY - h;
                const cpX = b.x + lean * 0.38;
                const cpY = b.baseY - h * 0.52;

                let cBase, cTip;
                if (b.layer === 0) {
                    cBase = mixRGB(62, 68, 36, 4, 120, 87, t);
                    cTip  = mixRGB(96, 104, 52, 16, 185, 129, t);
                } else if (b.layer === 1) {
                    cBase = mixRGB(78, 86, 44, 5, 150, 105, t);
                    cTip  = mixRGB(122, 130, 62, 34, 197, 94, t);
                } else {
                    cBase = mixRGB(96, 105, 50, 16, 185, 129, t);
                    cTip  = mixRGB(146, 154, 72, 74, 222, 128, t);
                }

                tCtx.save();
                tCtx.globalAlpha = 1.0;
                tCtx.beginPath();
                tCtx.moveTo(b.x - b.w / 2, b.baseY);
                tCtx.quadraticCurveTo(cpX, cpY, tipX, tipY);
                tCtx.quadraticCurveTo(cpX + b.w * 0.32, cpY, b.x + b.w / 2, b.baseY);
                tCtx.closePath();

                const grad = tCtx.createLinearGradient(b.x, b.baseY, tipX, tipY);
                grad.addColorStop(0, cBase);
                grad.addColorStop(1, cTip);
                tCtx.fillStyle = grad;
                tCtx.fill();

                if (b.hasDew && t > 0.35) {
                    tCtx.globalAlpha = Math.min(0.95, (t - 0.35) * 1.4);
                    tCtx.beginPath();
                    tCtx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
                    tCtx.fillStyle = '#0284C7';
                    tCtx.fill();
                }
                tCtx.restore();
            }

            function drawTerrariumBase(t) {
                tCtx.save();
                tCtx.globalAlpha = 1.0;

                tCtx.fillStyle = mixRGB(38, 32, 27, 72, 54, 40, t);
                tCtx.beginPath();
                tCtx.moveTo(0, 440);
                tCtx.quadraticCurveTo(W * 0.25, 433, W * 0.5, 439);
                tCtx.quadraticCurveTo(W * 0.75, 445, W, 437);
                tCtx.lineTo(W, H);
                tCtx.lineTo(0, H);
                tCtx.closePath();
                tCtx.fill();

                const pickets = 15;
                const step = W / pickets;
                const fenceFill = mixRGB(64, 70, 80, 255, 255, 255, t);
                const fenceStroke = mixRGB(40, 45, 54, 148, 163, 184, t);
                const fenceRail = mixRGB(48, 53, 62, 203, 213, 225, t);

                tCtx.fillStyle = fenceRail;
                tCtx.fillRect(0, 462, W, 5);
                tCtx.fillRect(0, 478, W, 5);

                for (let i = 0; i < pickets; i++) {
                    const px = i * step + 5;
                    const pw = step - 7;
                    const py = 448;
                    const ph = 40;

                    tCtx.beginPath();
                    tCtx.moveTo(px, py + 8);
                    tCtx.lineTo(px + pw / 2, py);
                    tCtx.lineTo(px + pw, py + 8);
                    tCtx.lineTo(px + pw, py + ph);
                    tCtx.lineTo(px, py + ph);
                    tCtx.closePath();
                    tCtx.fillStyle = fenceFill;
                    tCtx.fill();
                    tCtx.strokeStyle = fenceStroke;
                    tCtx.lineWidth = 1;
                    tCtx.stroke();
                }

                tCtx.fillStyle = mixRGB(30, 33, 40, 204, 163, 118, t);
                tCtx.fillRect(0, 486, W, 14);
                tCtx.restore();
            }

            function animateAll() {
                tick++;
                tCtx.clearRect(0, 0, W, H);
                bCtx.clearRect(0, 0, BW, BH);

                if (isMisting) {
                    hydration = Math.min(1.0, hydration + 0.016);
                } else {
                    hydration = Math.max(0.0, hydration - 0.014);
                }

                draw3DChamberLines(hydration);

                for (let i = 0; i < grassBlades.length; i++) {
                    if (grassBlades[i].layer === 0) drawGrass(grassBlades[i], hydration);
                }
                for (let i = 0; i < broadPlants.length; i++) {
                    drawPlantCluster(broadPlants[i], hydration);
                }
                for (let i = 0; i < grassBlades.length; i++) {
                    if (grassBlades[i].layer > 0) drawGrass(grassBlades[i], hydration);
                }

                if (isMisting && sprayDrops.length < 175) {
                    for (let i = 0; i < 6; i++) {
                        sprayDrops.push(createSprayDrop());
                    }
                }

                for (let i = sprayDrops.length - 1; i >= 0; i--) {
                    const d = sprayDrops[i];
                    d.x += d.vx;
                    d.y += d.vy;
                    d.vy += 0.055;

                    if (d.y > 348 + Math.random() * 72) {
                        if (!d.isMist && Math.random() > 0.5) {
                            splashes.push({
                                x: d.x,
                                y: d.y,
                                vx: (Math.random() - 0.5) * 2.2,
                                vy: -1.3 - Math.random() * 1.6,
                                r: 1.3 + Math.random(),
                                alpha: 0.88
                            });
                        }
                        if (isMisting) {
                            sprayDrops[i] = createSprayDrop();
                        } else {
                            sprayDrops.splice(i, 1);
                        }
                        continue;
                    }

                    tCtx.save();
                    tCtx.globalAlpha = Math.max(0.08, Math.min(1.0, d.alpha));
                    if (d.isMist) {
                        tCtx.beginPath();
                        tCtx.fillStyle = d.color;
                        tCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                        tCtx.fill();
                    } else {
                        tCtx.beginPath();
                        tCtx.strokeStyle = d.color;
                        tCtx.lineWidth = d.size;
                        tCtx.lineCap = 'round';
                        tCtx.moveTo(d.x, d.y);
                        tCtx.lineTo(d.x - d.vx * 2.0, d.y - d.vy * 2.0);
                        tCtx.stroke();
                    }
                    tCtx.restore();
                }

                for (let i = splashes.length - 1; i >= 0; i--) {
                    const sp = splashes[i];
                    sp.x += sp.vx;
                    sp.y += sp.vy;
                    sp.vy += 0.12;
                    sp.alpha -= 0.04;
                    if (sp.alpha <= 0.04) {
                        splashes.splice(i, 1);
                        continue;
                    }
                    tCtx.save();
                    tCtx.globalAlpha = sp.alpha;
                    tCtx.beginPath();
                    tCtx.fillStyle = '#0284C7';
                    tCtx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
                    tCtx.fill();
                    tCtx.restore();
                }

                drawTerrariumBase(hydration);

                if (isMisting && bridgeMist.length < 45) {
                    bridgeMist.push(createBridgeParticle());
                }

                for (let i = bridgeMist.length - 1; i >= 0; i--) {
                    const bm = bridgeMist[i];
                    bm.x += bm.vx;
                    bm.y += bm.vy + Math.sin(tick * 0.03 + i) * 0.2;

                    if (bm.x < 540) {
                        bm.alpha = Math.min(bm.maxAlpha, bm.alpha + 0.015);
                    } else {
                        bm.alpha -= 0.012;
                    }

                    if (bm.alpha <= 0.01 || bm.x > 680) {
                        if (isMisting) {
                            bridgeMist[i] = createBridgeParticle();
                        } else {
                            bridgeMist.splice(i, 1);
                        }
                        continue;
                    }

                    bCtx.save();
                    bCtx.globalAlpha = bm.alpha;
                    bCtx.beginPath();
                    bCtx.fillStyle = bm.color;
                    bCtx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2);
                    bCtx.fill();
                    bCtx.restore();
                }

                requestAnimationFrame(animateAll);
            }

            requestAnimationFrame(animateAll);

            terrariumTrigger.addEventListener('click', function () {
                isMisting = body.classList.toggle('mist-on');
                if (isMisting && usernameInput) {
                    setTimeout(function () {
                        usernameInput.focus();
                    }, 400);
                }
            });
        })();

</script>
</body>
</html>
