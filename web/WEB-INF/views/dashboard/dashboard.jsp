<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/WEB-INF/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="IoT Dashboard" />
    <jsp:param name="activeNav" value="${activeNav != null ? activeNav : 'dashboard'}" />
</jsp:include>

<!-- ===================================================================
     VIEW 1: IOT MONITORING & CONTROL DASHBOARD
     ================================================================== -->
<div class="view-pane ${activeNav == 'dashboard' || empty activeNav ? 'active' : ''}" id="view-dashboard">

    <!-- Self-Contained High-End Master Styles for Digital Twin 3D Viewport & HUD -->
    <style id="digital-twin-master-css">
        /* ── Host Layout: Seamless Workspace Embedding ── */
        #view-viewport.viewport-dashboard-active,
        #view-viewport:has(#view-dashboard.active),
        body.dashboard-active #view-viewport {
            padding: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            height: calc(100vh - 48px) !important;
        }

        /* =========================================================
           SPATIAL EMBEDDED DASHBOARD VIEWPORT
           ========================================================= */

        /* Viewport Pane — strictly hidden on any subpage, active flex on dashboard */
        #view-dashboard:not(.active) {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }
        #view-dashboard.active {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            flex: 1 !important;
            padding: 10px 14px 14px 14px !important;
            margin: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 1;
        }

        /* Viewport Frame — fills workspace cleanly with 20px spatial elevation bevel */
        #digital-twin-viewport {
            position: relative;
            width: 100%;
            height: 100%;
            flex: 1;
            min-height: calc(100vh - 72px);
            border-radius: 20px;
            overflow: hidden;
            box-sizing: border-box;
            isolation: isolate;
        }
        #digital-twin-viewport {
            position: relative;
            width: 100%;
            height: 100%;
            flex: 1;
            min-height: calc(100vh - 72px);
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            isolation: isolate;
            transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #digital-twin-viewport.telemetry-drawer-open {
            width: calc(100% - 500px) !important;
        }
        @media (max-width: 1200px) {
            #digital-twin-viewport.telemetry-drawer-open {
                width: 100% !important;
            }
        }
        html.light #digital-twin-viewport {
            background:
                radial-gradient(ellipse 90% 70% at 50% 20%, #ffffff 0%, #f8fafc 55%, #edf2f7 100%) !important;
            border: 1px solid rgba(15, 23, 42, 0.09) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), 0 14px 38px rgba(15, 23, 42, 0.06) !important;
            color: #0f172a !important;
        }
        html.dark #digital-twin-viewport {
            background:
                radial-gradient(1.2px 1.2px at 15% 22%, rgba(255, 255, 255, 0.45), transparent),
                radial-gradient(1.4px 1.4px at 68% 18%, rgba(255, 255, 255, 0.40), transparent),
                radial-gradient(1.0px 1.0px at 35% 72%, rgba(255, 255, 255, 0.35), transparent),
                radial-gradient(1.3px 1.3px at 84% 65%, rgba(255, 255, 255, 0.40), transparent),
                radial-gradient(ellipse 85% 65% at 50% 36%, rgba(255, 255, 255, 0.02) 0%, rgba(10, 10, 14, 0.65) 50%, #030305 100%) !important;
            border: 1px solid rgba(255, 255, 255, 0.10) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 24px 60px rgba(0, 0, 0, 0.90) !important;
        }

        /* 3D Canvas Container */
        .garden3d {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            outline: none;
        }
        .garden3d-stage {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            outline: none;
            cursor: grab;
        }
        .garden3d-stage:active {
            cursor: grabbing;
        }
        .garden3d-stage canvas {
            width: 100% !important;
            height: 100% !important;
            display: block;
        }

        /* Stage Helper Floating Pill (Bottom-Left) */
        .garden3d-stage-controls {
            position: absolute;
            bottom: 20px;
            left: 24px;
            z-index: 20;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 9999px;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            font-size: 11px;
            font-weight: 600;
            user-select: none;
            transition: all 0.2s ease;
        }
        html.light .garden3d-stage-controls {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #1e293b;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
        }
        html.dark .garden3d-stage-controls {
            background: rgba(13, 21, 30, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e2e8f0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }
        .stage-btn-pill {
            background: none;
            border: none;
            color: inherit;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .stage-btn-pill:hover {
            color: #10b981;
            background: rgba(16, 185, 129, 0.15);
        }

        /* 1. Floating Action Capsule (Top-Center) */
        #floating-action-capsule {
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 40;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 7px 18px;
            border-radius: 9999px;
            backdrop-filter: blur(24px) saturate(190%);
            -webkit-backdrop-filter: blur(24px) saturate(190%);
            user-select: none;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        html.light #floating-action-capsule {
            background: rgba(255, 255, 255, 0.92);
            border: 1.5px solid rgba(16, 185, 129, 0.4);
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08), 0 0 18px rgba(16, 185, 129, 0.15);
            color: #0f172a;
        }
        html.dark #floating-action-capsule {
            background: rgba(10, 10, 14, 0.90);
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.16);
            color: #f8fafc;
        }
        .btn-quick-spray {
            position: relative;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.12);
            border: none !important;
            color: #10b981;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
            outline: none;
        }
        .btn-quick-spray:hover {
            background: rgba(16, 185, 129, 0.3);
            transform: scale(1.08);
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
        }
        .quick-spray-ring {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        .spray-circular-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }
        .spray-ring-progress {
            transition: stroke-dashoffset 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #quick-spray-counter {
            font-size: 11px;
            font-weight: 800;
            color: #10b981;
            font-family: 'JetBrains Mono', monospace;
            line-height: 1;
        }
        .capsule-divider {
            width: 1px;
            height: 20px;
            background: rgba(148, 163, 184, 0.35);
        }
        #btn-toggle-mode {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 9999px;
            cursor: pointer;
            outline: none;
            border: none;
            letter-spacing: 0.04em;
            transition: all 0.2s ease;
        }
        .capsule-switch-auto {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #ffffff !important;
            box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
        }
        .capsule-switch-manual {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #020617 !important;
            box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
        }
        .capsule-plant-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #capsule-plant-selector {
            background: transparent;
            border: none;
            color: inherit;
            font-size: 12px;
            font-weight: 600;
            font-family: inherit;
            outline: none;
            cursor: pointer;
            padding: 2px 4px;
        }
        #capsule-plant-selector option {
            background: #ffffff;
            color: #0f172a;
        }
        html.dark #capsule-plant-selector option {
            background: #0f172a;
            color: #f8fafc;
        }
        #capsule-conn-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            font-weight: 700;
            color: #10b981;
            padding: 4px 10px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            border-radius: 9999px;
            letter-spacing: 0.04em;
        }
        .pulse-dot {
            display: inline-block;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            animation: pulseDotAnim 2s infinite ease-in-out;
        }
        @keyframes pulseDotAnim {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }
        .capsule-drawer-trigger {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 9999px;
            padding: 5px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            outline: none;
        }
        html.light .capsule-drawer-trigger {
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.12);
            color: #0f172a;
        }
        html.light .capsule-drawer-trigger:hover {
            background: rgba(16, 185, 129, 0.12);
            border-color: #10b981;
            color: #047857;
        }
        html.dark .capsule-drawer-trigger {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #f8fafc;
        }
        html.dark .capsule-drawer-trigger:hover {
            background: rgba(16, 185, 129, 0.2);
            border-color: #10b981;
            color: #10b981;
        }

        /* 2. Organic Hex-Cluster (Bottom-Right Honeycomb) */
        #organic-hex-cluster {
            position: fixed;
            right: 28px;
            bottom: 24px;
            z-index: 35;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0;
            pointer-events: auto;
            user-select: none;
            transition: transform 0.3s ease, opacity 0.3s ease;
            /* Ambient glow beneath the whole cluster */
            filter: none;
        }
        .hex-row {
            display: flex;
            gap: 8px;
        }
        .hex-row-top {
            margin-bottom: -18px;
            padding-right: 43px;
        }
        .hex-tile {
            position: relative;
            width: 86px;
            height: 98px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), filter 0.28s;
            overflow: visible;
            box-sizing: border-box;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        html.light .hex-tile,
        html.dark .hex-tile {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            filter: none !important;
        }
        .hex-tile:hover {
            transform: translateY(-4px) scale(1.05);
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            z-index: 10;
        }
        .hex-tile:active {
            transform: scale(0.97);
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .hex-tile.morph-source {
            opacity: 0.35;
            transform: scale(0.92);
            pointer-events: none;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .hex-border-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2;
            transition: color 0.2s ease, filter 0.2s ease;
        }
        html.light .hex-border-svg {
            color: rgba(148, 163, 184, 0.45);
        }
        html.dark .hex-border-svg {
            color: rgba(255, 255, 255, 0.22);
            filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.15));
        }
        .hex-tile[data-sensor="soil"]:hover .hex-border-svg { color: #10b981; filter: drop-shadow(0 0 6px #10b981); }
        .hex-tile[data-sensor="water"]:hover .hex-border-svg { color: #0284c7; filter: drop-shadow(0 0 6px #0284c7); }
        .hex-tile[data-sensor="rain"]:hover .hex-border-svg { color: #06b6d4; filter: drop-shadow(0 0 6px #06b6d4); }
        .hex-tile[data-sensor="temperature"]:hover .hex-border-svg { color: #f59e0b; filter: drop-shadow(0 0 6px #f59e0b); }
        .hex-tile[data-sensor="relay"]:hover .hex-border-svg { color: #10b981; filter: drop-shadow(0 0 6px #10b981); }

        .hex-content {
            position: relative;
            z-index: 3;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 0 4px;
            text-align: center;
        }
        .hex-header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin-bottom: 2px;
        }
        .hex-tag {
            font-size: 8.5px;
            font-weight: 800;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        .hex-metric-row {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 2px;
            line-height: 1.1;
        }
        .hex-val {
            font-size: 15px;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            color: var(--text-main);
        }
        .hex-unit {
            font-size: 9.5px;
            font-weight: 700;
            color: var(--text-secondary);
        }
        .hex-bar-track {
            width: 44px;
            height: 3px;
            background: rgba(148, 163, 184, 0.25);
            border-radius: 2px;
            margin-top: 4px;
            overflow: hidden;
        }
        .hex-bar-fill {
            height: 100%;
            background: #10b981;
            border-radius: 2px;
            transition: width 0.4s ease;
        }
        .hex-tile[data-sensor="water"] .hex-bar-fill {
            background: #0284c7;
        }
        .hex-icon-box {
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
        }

        /* 3. Morphing UI Detail Card */
        #morph-detail-card {
            position: fixed;
            right: 28px;
            bottom: 24px;
            z-index: 45;
            display: none;
            width: 330px;
            border-radius: 20px;
            padding: 18px 20px;
            box-sizing: border-box;
            backdrop-filter: blur(24px) saturate(190%);
            -webkit-backdrop-filter: blur(24px) saturate(190%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
            user-select: none;
        }
        html.light #morph-detail-card {
            background: rgba(255, 255, 255, 0.95);
            border: 1.5px solid rgba(16, 185, 129, 0.35);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 0 20px rgba(16, 185, 129, 0.1);
            color: #0f172a;
        }
        html.dark #morph-detail-card {
            background: rgba(10, 16, 25, 0.95);
            border: 1.5px solid rgba(16, 185, 129, 0.45);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 24px rgba(16, 185, 129, 0.2);
            color: #f8fafc;
        }
        .detail-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .detail-card-title {
            font-size: 15px;
            font-weight: 700;
            margin: 0;
            color: var(--text-main);
        }
        .btn-close-detail {
            background: rgba(148, 163, 184, 0.15);
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-main);
            transition: background 0.2s;
        }
        .btn-close-detail:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        .detail-metric-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 14px;
        }
        .detail-card-val {
            font-size: 32px;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
            color: var(--text-main);
            line-height: 1;
        }
        .detail-card-safe {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
        }
        .detail-sparkline-wrap {
            margin-bottom: 14px;
            background: rgba(148, 163, 184, 0.06);
            border: 1px solid var(--border-hairline);
            border-radius: 12px;
            padding: 10px 12px;
        }
        .sparkline-canvas {
            width: 100%;
            height: 60px;
            display: block;
        }
        .detail-actions-row {
            display: flex;
            gap: 8px;
        }

        /* 4. Slide-Over Telemetry History Drawer */
        #telemetry-drawer {
            position: fixed;
            right: 0;
            top: 0;
            width: min(600px, 94vw);
            height: 100vh;
            transform: translateX(100%);
            z-index: 1000;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding: 20px 24px;
            box-sizing: border-box;
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
        }
        html.light #telemetry-drawer {
            background: rgba(255, 255, 255, 0.96);
            border-left: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);
        }
        html.dark #telemetry-drawer {
            background: rgba(12, 12, 16, 0.92);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: -15px 0 50px rgba(0, 0, 0, 0.7);
        }
        #drawer-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 999;
            display: none;
        }

        /* ── MORPH ANIMATION: Card opens from hex with spring ── */
        @keyframes morphCardIn {
            from {
                opacity: 0;
                transform: scale(0.72) translateY(18px);
                filter: blur(4px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
                filter: blur(0);
            }
        }
        @keyframes morphCardOut {
            from { opacity: 1; transform: scale(1); filter: blur(0); }
            to   { opacity: 0; transform: scale(0.8) translateY(10px); filter: blur(3px); }
        }
        #morph-detail-card.morphed-open {
            animation: morphCardIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ── GLASS HEX TILE: Fix backdrop-filter blocked by clip-path ── */
        /* Wrapper carries the blur; inner carries the clip-path shape */
        .hex-tile-wrap {
            position: relative;
            width: 78px;
            height: 88px;
            flex-shrink: 0;
        }
        .hex-tile-wrap::before {
            display: none !important;
        }

        /* ── ENHANCED MORPH RETURN GHOST ── */
        .morph-return-ghost {
            position: fixed;
            z-index: 9999;
            border-radius: 20px;
            pointer-events: none;
            transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease, border-radius 0.28s ease;
            background: rgba(16, 185, 129, 0.12);
            border: 1.5px solid rgba(16, 185, 129, 0.4);
            backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.15);
        }

        /* ── HEX DOCKED PULSE: bounce on close ── */
        @keyframes hexDockPulse {
            0%   { transform: scale(1); }
            35%  { transform: scale(1.18) rotate(6deg); filter: brightness(1.3); }
            65%  { transform: scale(0.93) rotate(-3deg); }
            100% { transform: scale(1) rotate(0); filter: brightness(1); }
        }
        .hex-tile.morph-docked-pulse {
            animation: hexDockPulse 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ── DETAIL CARD: Less opaque, more glass depth ── */
        html.dark #morph-detail-card {
            background: rgba(10, 10, 14, 0.90) !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.90), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
        }
        html.light #morph-detail-card {
            background: rgba(255, 255, 255, 0.88) !important;
            border: 1px solid rgba(16, 185, 129, 0.3) !important;
            box-shadow: 0 16px 44px rgba(0, 0, 0, 0.1), 0 0 20px rgba(16, 185, 129, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        }

        /* ── AGRI ALERT BANNER: Elevated visual hierarchy ── */
        .detail-card-agri-alert {
            border-radius: 10px;
            margin-bottom: 12px;
            padding: 10px 12px;
            font-size: 10.5px;
            line-height: 1.45;
        }

        /* ── CAPSULE: Reduce height slightly, make more pill-like ── */
        #floating-action-capsule {
            padding: 5px 14px !important;
            gap: 10px !important;
        }

        /* ── STAGE CONTROLS: Make more translucent ── */
        html.dark .garden3d-stage-controls {
            background: rgba(8, 14, 24, 0.7) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
            #floating-action-capsule {
                top: 10px;
                padding: 4px 10px;
                gap: 6px;
                transform: translateX(-50%) scale(0.9);
                position: fixed;
            }
            #organic-hex-cluster {
                right: 14px;
                bottom: 14px;
                transform: scale(0.85);
                transform-origin: bottom right;
                position: fixed;
            }
            #morph-detail-card {
                right: 14px;
                bottom: 14px;
                width: calc(100vw - 28px);
                position: fixed;
            }
        }
    
        /* Hide in-scene floating duplicate tag buttons & vertical zoom slider */
        .garden3d-label {
            display: none !important;
        }
        .garden3d-zoom {
            display: none !important;
        }

        /* 3D Viewport Resizing when Telemetry History is open */
        #digital-twin-viewport {
            transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        #digital-twin-viewport.telemetry-drawer-open {
            width: calc(100% - 460px) !important;
        }
        @media (max-width: 1100px) {
            #digital-twin-viewport.telemetry-drawer-open {
                width: 100% !important;
            }
        }

        /* Floating Telemetry History Glass Card (Right Side) */
        #telemetry-drawer {
            position: fixed !important;
            right: 18px !important;
            top: 18px !important;
            bottom: 18px !important;
            width: min(440px, calc(100vw - 36px)) !important;
            height: calc(100vh - 36px) !important;
            max-height: calc(100vh - 36px) !important;
            border-radius: 20px !important;
            transform: translateX(calc(100% + 40px)) !important;
            z-index: 1000 !important;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
            padding: 22px 24px !important;
            backdrop-filter: blur(28px) saturate(190%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
        }
        #telemetry-drawer.open {
            transform: translateX(0) !important;
        }
        html.light #telemetry-drawer {
            background: rgba(255, 255, 255, 0.94) !important;
            border: 1px solid rgba(15, 23, 42, 0.10) !important;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1) !important;
            color: #0f172a !important;
        }
        html.dark #telemetry-drawer {
            background: rgba(10, 10, 14, 0.90) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.90), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
            color: #f8fafc !important;
        }


        /* Four-sensor dashboard. Keep the control bar reachable when the drawer opens. */
        #organic-hex-cluster .hex-row-bottom { justify-content: flex-end !important; padding-right: 47px !important; }
        #organic-hex-cluster .hex-row-bottom .hex-tile { flex-shrink: 0; }
        body.has-telemetry-open #organic-hex-cluster .hex-row-bottom { padding-right: 0 !important; }
        #organic-hex-cluster .hex-bar-track { width: 48px; height: 4px; margin-top: 6px; }
        #organic-hex-cluster .hex-val { font-variant-numeric: tabular-nums; }
        #telemetry-visible-stop { display: none !important; }

        /* =========================================================
           SMART SCADA ANTI-COLLISION & RESPONSIVE HUD
           Ensures zero-overlap and generous spacing at all zoom levels (100%-200%).
           Weather Clock docks at top-left. Control Capsule centers at top (or docks cleanly).
           ========================================================= */
        #digital-twin-viewport #hud-weather-clock {
            position: absolute !important;
            top: 16px !important;
            left: 16px !important;
            right: auto !important;
            width: auto !important;
            min-width: 250px !important;
            max-width: 320px !important;
            padding: 8px 14px !important;
            z-index: 55 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            white-space: nowrap !important;
        }

        #digital-twin-viewport #hud-weather-clock * {
            white-space: nowrap !important;
        }
        /* Weather Clock Precision Dimensions & Zero Overflow */
        #digital-twin-viewport #hud-weather-clock {
            width: 350px !important;
            max-width: 350px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        #digital-twin-viewport #hud-tier2-weather {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 6px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        #digital-twin-viewport #hud-tier2-weather .sw-pill-btn {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            max-width: calc(50% - 3px) !important;
            padding: 3px 6px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            white-space: nowrap !important;
        }
        #digital-twin-viewport #hud-location-name {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            max-width: 98px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: inline-block !important;
            vertical-align: middle !important;
        }
        #digital-twin-viewport #hud-weather-condition {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            max-width: 82px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: inline-block !important;
            vertical-align: middle !important;
        }
        #digital-twin-viewport #hud-forecast-dropdown {
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        #digital-twin-viewport #hud-milestones-grid {
            width: 100% !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 4px !important;
            box-sizing: border-box !important;
        }
        #digital-twin-viewport .hud-milestone-pill {
            min-width: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 3px 2px !important;
        }
        #digital-twin-viewport .hud-milestone-uv {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            display: block !important;
            font-size: 8.5px !important;
        }


        #digital-twin-viewport > #floating-action-capsule {
            position: absolute !important;
            top: 16px !important;
            right: 20px !important;
            left: auto !important;
            transform: none !important;
            z-index: 70 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            white-space: nowrap !important;
            flex-wrap: nowrap !important;
            width: auto !important;
            max-width: none !important;
            box-sizing: border-box !important;
            padding: 5px 12px !important;
        }

        #digital-twin-viewport > #floating-action-capsule * {
            white-space: nowrap !important;
        }

        /* Standard 5 Hexagons Cluster (Drawer Closed): Bottom-Right */
        #digital-twin-viewport > #organic-hex-cluster {
            position: absolute !important;
            right: 24px !important;
            bottom: 24px !important;
            z-index: 65 !important;
            transform: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 0 !important;
        }

        /* Responsive dodge when viewport width < 1200px or zoomed (Drawer Closed) */
        @media (max-width: 1200px) {
            body.dashboard-active:not(.has-telemetry-open) #digital-twin-viewport > #floating-action-capsule {
                top: 86px !important;
                left: 16px !important;
                right: auto !important;
                transform: none !important;
            }
        }

        @media (max-width: 700px) {
            body.dashboard-active #digital-twin-viewport #hud-weather-clock {
                top: 10px !important;
                left: 10px !important;
                max-width: calc(100% - 20px) !important;
            }
            body.dashboard-active #digital-twin-viewport > #floating-action-capsule {
                top: 86px !important;
                left: 10px !important;
                max-width: calc(100% - 20px) !important;
                overflow-x: auto !important;
            }
        }

        /* On desktop, the analytics panel occupies its own right column */
        @media (min-width: 1100px) {
            body.has-telemetry-open #digital-twin-viewport {
                width: calc(100% - 470px) !important;
                max-width: calc(100% - 470px) !important;
                flex: 1 1 auto !important;
                margin: 0 !important;
            }
            body.has-telemetry-open #telemetry-drawer {
                position: absolute !important;
                top: 10px !important;
                bottom: 14px !important;
                right: 14px !important;
                width: 440px !important;
                max-width: 440px !important;
                height: auto !important;
                max-height: none !important;
            }
        }



        /* Bio-Telemetry Deck Legends & Table: Prevent multi-line wrapping */
        #telemetry-drawer .chart-legend,
        #telemetry-drawer .telemetry-horizon-legend,
        #telemetry-drawer .hud-legend-group {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 16px !important;
            white-space: nowrap !important;
            font-size: 11.5px !important;
            overflow-x: auto !important;
        }

        #telemetry-drawer .telemetry-legend-item,
        #telemetry-drawer .hud-legend-item {
            white-space: nowrap !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
        }

        #telemetry-drawer table th,
        #telemetry-drawer table td {
            white-space: nowrap !important;
            padding: 8px 10px !important;
            font-size: 11.5px !important;
            text-align: center !important;
        }


        /* Avoid any control truncation or overlay on tablet and small desktops. */
        @media (max-width: 1199px) {
            body.has-telemetry-open #view-viewport,
            body.has-telemetry-open #view-viewport:has(#view-dashboard.active) {
                height: calc(100vh - 48px) !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                display: block !important;
            }
            body.has-telemetry-open #view-dashboard.active {
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 14px !important;
            }
            body.has-telemetry-open #digital-twin-viewport {
                width: 100% !important;
                max-width: 100% !important;
                height: 570px !important;
                min-height: 570px !important;
                flex: 0 0 570px !important;
                margin: 0 !important;
                overflow: hidden !important;
            }
            body.has-telemetry-open #telemetry-drawer {
                position: relative !important;
                top: auto !important;
                right: auto !important;
                bottom: auto !important;
                left: auto !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                transform: none !important;
                flex: 0 0 auto !important;
                overflow: visible !important;
                z-index: 30 !important;
            }
            #telemetry-drawer:not(.open) {
                display: none !important;
            }
            body.has-telemetry-open #telemetry-drawer.open {
                display: flex !important;
            }
        }
        /* Leave room for the safety Stop Pump button beside the orbit toolbar. */
        body.has-telemetry-open #digital-twin-viewport #g3d-studio-dock {
            left: 160px !important;
            bottom: 18px !important;
            max-width: calc(100% - 178px) !important;
        }
        @media (min-width: 1200px) and (max-width: 1379px) {
            body.has-telemetry-open #digital-twin-viewport #g3d-studio-dock {
                display: none !important;
            }
        }
        @media (max-width: 700px) {
            /* On compact screens, gestures still rotate the scene;
               the secondary orbit toolbar is hidden to protect Stop Pump. */
            body.has-telemetry-open #digital-twin-viewport #g3d-studio-dock {
                display: none !important;
            }
            body.has-telemetry-open #digital-twin-viewport .hud-tier2-weather {
                flex-wrap: wrap !important;
                white-space: normal !important;
                justify-content: flex-start !important;
            }
            body.has-telemetry-open #digital-twin-viewport .hud-tier2-weather .sw-pill-btn {
                flex: 0 1 auto !important;
                max-width: 100% !important;
            }
            body.has-telemetry-open #digital-twin-viewport .forecast-metrics {
                flex-wrap: wrap !important;
            }
            body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
                bottom: 85px !important;
            }
            body.has-telemetry-open #digital-twin-viewport #hud-forecast-dropdown {
                overflow: hidden !important;
            }
            body.has-telemetry-open #digital-twin-viewport #hud-weather-clock {
                top: 142px !important;
            }
            body.has-telemetry-open #digital-twin-viewport {
                min-height: 700px !important;
                height: 700px !important;
                flex-basis: 700px !important;
            }
            body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule {
                top: 12px !important;
                left: 12px !important;
                max-width: calc(100% - 24px) !important;
                padding: 6px 8px !important;
                gap: 6px !important;
            }
            body.has-telemetry-open #digital-twin-viewport #hud-weather-clock {
                top: 132px !important;
                left: 12px !important;
                width: 368px !important;
                max-width: calc(100% - 24px) !important;
            }
            body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
                display: flex !important;
                right: 10px !important;
                bottom: 85px !important;
                gap: 4px !important;
            }
            body.has-telemetry-open #organic-hex-cluster .hex-row {
                display: flex !important;
                flex-direction: column !important;
            }
            body.has-telemetry-open #digital-twin-viewport > #telemetry-visible-stop {
                left: 12px !important;
                bottom: 14px !important;
                padding: 0 12px !important;
            }
        }

        /* Large, centered PUMP status under the 2 x 2 sensor grid.
           A single column layout also prevents Telemetry mode from shifting
           the PUMP tile into a third column. */
        #digital-twin-viewport > #organic-hex-cluster {
            width: 190px !important;
            align-items: center !important;
        }
        #organic-hex-cluster .hex-row-top,
        #organic-hex-cluster .hex-row-bottom {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
            padding: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        #organic-hex-cluster .hex-row-top {
            margin-bottom: -18px !important;
        }
        #organic-hex-cluster .hex-row-pump {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: center !important;
            align-self: center !important;
            width: 100% !important;
            margin: -3px 0 0 !important;
            padding: 0 !important;
            gap: 0 !important;
        }
        #organic-hex-cluster .hex-row-pump .hex-tile {
            width: 132px !important;
            height: 150px !important;
            flex-shrink: 0 !important;
        }
        #organic-hex-cluster .hex-row-pump .hex-tag {
            font-size: 12px !important;
            letter-spacing: 0.08em;
        }
        #organic-hex-cluster .hex-row-pump #stat-pump-state {
            font-size: 19px !important;
            font-weight: 800 !important;
        }
        #organic-hex-cluster .hex-row-pump .hex-header-row {
            margin-bottom: 7px;
        }
        #organic-hex-cluster .hex-row-pump .hex-bar-track {
            width: 72px !important;
            height: 5px !important;
            margin-top: 9px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 190px !important;
            gap: 0 !important;
        }
        body.has-telemetry-open #organic-hex-cluster .hex-row {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            gap: 8px !important;
        }
        body.has-telemetry-open #organic-hex-cluster .hex-row-top {
            margin-bottom: -18px !important;
        }
        body.has-telemetry-open #organic-hex-cluster .hex-row-pump {
            width: 100% !important;
            justify-content: center !important;
            margin-top: -3px !important;
        }
        @media (max-width: 700px) {
            body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
                transform: scale(0.78) !important;
                transform-origin: bottom right !important;
            }
        }

        /* Center the control capsule when drawer is closed. */
        @media (min-width: 701px) {
            body.dashboard-active:not(.has-telemetry-open) #digital-twin-viewport > #floating-action-capsule {
                position: absolute !important;
                top: 16px !important;
                right: 20px !important;
                left: auto !important;
                transform: none !important;
                width: max-content !important;
                max-width: calc(100% - 24px) !important;
                flex-wrap: nowrap !important;
                white-space: nowrap !important;
                justify-content: center !important;
                z-index: 90 !important;
            }
        }

        /* ==============================================================
           SMART MISTING / HONEYCOMB & RESPONSIVE TELEMETRY (FINAL)
           Keep five equal-size tiles; let the dock center + compact.
           This is intentionally the last dashboard CSS rule set.
           ============================================================== */
        #digital-twin-viewport > #organic-hex-cluster,
        body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
            --sm-hex-size: 82px;
            --sm-hex-height: 94px;
            --sm-hex-gap: 6px;
            position: absolute !important;
            top: auto !important;
            left: auto !important;
            right: 20px !important;
            bottom: 22px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-end !important;
            width: calc(var(--sm-hex-size) * 3 + var(--sm-hex-gap) * 2) !important;
            gap: 0 !important;
            padding: 0 !important;
            transform: none !important;
            filter: none !important;
            z-index: 65 !important;
        }
        #organic-hex-cluster .hex-row,
        body.has-telemetry-open #organic-hex-cluster .hex-row {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
            gap: var(--sm-hex-gap) !important;
            padding: 0 !important;
            margin: 0 !important;
        }
       
/* TOP ROW: SOIL + TANK */
#organic-hex-cluster .hex-row-top,
body.has-telemetry-open #organic-hex-cluster .hex-row-top {
    margin-bottom: -22px !important;
}

/* BOTTOM ROW: AIR HUM + TEMP + PUMP */
#organic-hex-cluster .hex-row-bottom,
body.has-telemetry-open #organic-hex-cluster .hex-row-bottom {
    margin-bottom: 0 !important;
}

        #organic-hex-cluster .hex-row-pump,
        body.has-telemetry-open #organic-hex-cluster .hex-row-pump {
            align-self: center !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        #organic-hex-cluster .hex-tile,
        #organic-hex-cluster .hex-row-pump .hex-tile,
        body.has-telemetry-open #organic-hex-cluster .hex-tile,
        body.has-telemetry-open #organic-hex-cluster .hex-row-pump .hex-tile {
            width: var(--sm-hex-size) !important;
            height: var(--sm-hex-height) !important;
            min-width: var(--sm-hex-size) !important;
            max-width: var(--sm-hex-size) !important;
            min-height: var(--sm-hex-height) !important;
            max-height: var(--sm-hex-height) !important;
            flex: 0 0 var(--sm-hex-size) !important;
            padding: 0 !important;
            box-sizing: border-box !important;
        }
        #organic-hex-cluster .hex-border-svg {
            width: 100% !important;
            height: 100% !important;
        }
        #organic-hex-cluster .hex-content { width: 100% !important; padding: 0 5px !important; box-sizing: border-box !important; }
        #organic-hex-cluster .hex-tag,
        #organic-hex-cluster .hex-row-pump .hex-tag { font-size: 9px !important; letter-spacing: .045em !important; }
        #organic-hex-cluster .hex-val,
        #organic-hex-cluster .hex-row-pump #stat-pump-state { font-size: 13.5px !important; font-weight: 800 !important; }
        #organic-hex-cluster .hex-row-pump #stat-pump-state { font-size: 12px !important; letter-spacing: -.045em !important; }
        #organic-hex-cluster .hex-row-pump .hex-header-row { margin-bottom: 2px !important; }
        #organic-hex-cluster .hex-bar-track,
        #organic-hex-cluster .hex-row-pump .hex-bar-track {
            width: 52px !important; height: 4px !important; margin-top: 6px !important;
        }
        /* ── ZERO-COLLISION DYNAMIC HUD ARCHITECTURE ── */
        /* Normal Mode (Bio-Telemetry Deck Closed): Weather Top-Left, Capsule Centered */
        body.dashboard-active:not(.has-telemetry-open) #digital-twin-viewport #hud-weather-clock {
            position: absolute !important;
            top: 14px !important;
            left: 14px !important;
            right: auto !important;
            width: 350px !important;
            min-width: 330px !important;
            max-width: 350px !important;
            height: auto !important;
            padding: 8px 12px 10px 12px !important;
            border-radius: 14px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            z-index: 55 !important;
        }

        body.dashboard-active:not(.has-telemetry-open) #digital-twin-viewport > #floating-action-capsule {
            position: absolute !important;
            top: 14px !important;
            right: 20px !important;
            left: auto !important;
            bottom: auto !important;
            width: max-content !important;
            max-width: calc(100% - 28px) !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            justify-content: flex-end !important;
            align-items: center !important;
            transform: none !important;
            z-index: 60 !important;
        }

        @media (max-width: 900px) {
            body.dashboard-active:not(.has-telemetry-open) #digital-twin-viewport > #floating-action-capsule {
                top: 86px !important;
                left: 14px !important;
                right: auto !important;
                transform: none !important;
                max-width: calc(100% - 28px) !important;
            }
        }

        /* ==============================================================
           RESPONSIVE HUD TOPBAR: CLOCK & CONTROL CAPSULE (ZERO COLLISION)
           ============================================================== */
        /* Deck Open State (Bio-Telemetry Deck Open): Auto-flexible layout without overlap */
        body.has-telemetry-open #digital-twin-viewport #hud-weather-clock {
            position: absolute !important;
            top: 12px !important;
            left: 12px !important;
            width: max-content !important;
            min-width: 250px !important;
            max-width: 275px !important;
            height: auto !important;
            padding: 6px 10px 8px 10px !important;
            gap: 4px !important;
            border-radius: 12px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            z-index: 55 !important;
        }
        body.has-telemetry-open #digital-twin-viewport #hud-weather-clock .sw-clock-time {
            font-size: 13px !important;
        }
        body.has-telemetry-open #digital-twin-viewport #hud-weather-clock .sw-clock-date {
            font-size: 9.5px !important;
        }
        body.has-telemetry-open #digital-twin-viewport #hud-weather-clock .sw-pill-btn {
            padding: 2px 6px !important;
            font-size: 10px !important;
        }

        /* Sleek, proportionally compact control bar anchored on right vertically aligned with sensor hexes */
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule {
            position: absolute !important;
            top: 12px !important;
            right: 20px !important;
            left: auto !important;
            bottom: auto !important;
            transform: none !important;
            width: max-content !important;
            max-width: calc(100% - 308px) !important;
            height: 32px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 2px 8px !important;
            border-radius: 9999px !important;
            z-index: 60 !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
            scrollbar-width: none !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule::-webkit-scrollbar {
            display: none;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule .btn-quick-spray {
            width: 24px !important;
            height: 24px !important;
            min-width: 24px !important;
            padding: 0 !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule .quick-spray-ring {
            width: 24px !important;
            height: 24px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #quick-spray-counter {
            font-size: 9px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule .capsule-divider {
            height: 12px !important;
            margin: 0 1px !important;
            opacity: 0.25 !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #btn-toggle-mode {
            font-size: 10px !important;
            padding: 2px 7px !important;
            height: 24px !important;
            min-width: 44px !important;
            line-height: 20px !important;
            border-radius: 6px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-conn-badge {
            font-size: 10px !important;
            padding: 2px 8px !important;
            height: 24px !important;
            max-width: 175px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            border-radius: 6px !important;
            gap: 4px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-pulse-dot {
            width: 5px !important;
            height: 5px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #btn-open-drawer {
            font-size: 10px !important;
            padding: 2px 7px !important;
            height: 24px !important;
            border-radius: 6px !important;
            gap: 4px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #btn-open-drawer svg {
            width: 11px !important;
            height: 11px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule .capsule-actuation-cluster {
            display: inline-flex !important;
            align-items: center !important;
            gap: 3px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-btn-start,
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-btn-stop {
            font-size: 9px !important;
            padding: 2px 6px !important;
            height: 24px !important;
            border-radius: 5px !important;
            gap: 3px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-btn-start svg,
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule #capsule-btn-stop svg {
            width: 7px !important;
            height: 7px !important;
        }
        body.has-telemetry-open #digital-twin-viewport > #floating-action-capsule .capsule-plant-wrap {
            display: none !important;
        }

        /* Preserve emergency stop button */
        body.has-telemetry-open #digital-twin-viewport > #telemetry-visible-stop {
            left: 18px !important; bottom: 16px !important; z-index: 91 !important;
        }
        @media (max-width: 900px) {
            #digital-twin-viewport > #organic-hex-cluster,
            body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
                --sm-hex-size: 82px;
                --sm-hex-height: 93px;
                --sm-hex-gap: 4px;
                right: 12px !important;
                bottom: 22px !important;
            }
            body.dashboard-active #digital-twin-viewport #hud-weather-clock {
                top: 10px !important;
                left: 12px !important;
            }
        }
        @media (max-width: 480px) {
            #digital-twin-viewport > #organic-hex-cluster,
            body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
                --sm-hex-size: 78px;
                --sm-hex-height: 89px;
                right: 10px !important;
                bottom: 100px !important;
                transform: none !important;
            }
            body.has-telemetry-open #digital-twin-viewport > #telemetry-visible-stop {
                left: 12px !important;
                bottom: 14px !important;
            }
            body.has-telemetry-open #digital-twin-viewport #g3d-studio-dock { display: none !important; }
        }

/* Hide duplicate STOP PUMP button */
#telemetry-visible-stop,
body.has-telemetry-open #telemetry-visible-stop,
body.has-telemetry-open #digital-twin-viewport > #telemetry-visible-stop {
    display: none !important;
    visibility: hidden !important;
}

/* =========================================================
   VERTICAL SENSOR LAYOUT WHEN TELEMETRY DRAWER IS OPEN
   Matches original Image 4 & 5: Elegant, generous vertical column.
   Zero overlap, zero clipped text, perfectly proportioned.
   ========================================================= */
body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
    position: absolute !important;
    right: 18px !important;
    top: 50% !important;
    bottom: auto !important;
    left: auto !important;
    transform: translateY(-50%) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    align-items: center !important;
    width: 86px !important;
    height: auto !important;
    z-index: 65 !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Remove row grouping so all 5 tiles sit in 1 vertical column */
body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster > .hex-row {
    display: contents !important;
}

/* All five hexagons have the same authentic diamond size (86px x 98px) */
body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-tile {
    position: relative !important;
    width: 86px !important;
    height: 98px !important;
    min-width: 86px !important;
    max-width: 86px !important;
    min-height: 98px !important;
    max-height: 98px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    flex: none !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 2px !important;
    text-align: center !important;
    width: 100% !important;
}

body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-tag {
    font-size: 9.5px !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em !important;
    white-space: nowrap !important;
}

body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-val,
body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster #stat-pump-state {
    font-size: 13.5px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    line-height: 1.1 !important;
}

body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-metric-row {
    display: flex !important;
    align-items: baseline !important;
    justify-content: center !important;
    gap: 2px !important;
    white-space: nowrap !important;
}

body.has-telemetry-open #digital-twin-viewport #organic-hex-cluster .hex-bar-track {
    width: 48px !important;
    height: 4px !important;
    margin-top: 4px !important;
}

@media (max-height: 720px) {
    body.has-telemetry-open #digital-twin-viewport > #organic-hex-cluster {
        gap: 6px !important;
        transform: translateY(-50%) scale(0.85) !important;
        transform-origin: center right !important;
    }
}

/* ── AUTHENTIC HONEYCOMB FROSTED GLASS SENSORS (IMAGE 3, 4, 5 SPECIFICATION) ── */
.hex-pod-shape {
    fill: rgba(13, 17, 23, 0.88) !important;
    stroke: rgba(255, 255, 255, 0.18) !important;
    stroke-width: 1.5 !important;
    stroke-linejoin: round !important;
    transition: fill 0.25s ease, stroke 0.25s ease, filter 0.25s ease !important;
    filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.50)) !important;
}

html.light .hex-pod-shape {
    fill: rgba(255, 255, 255, 0.94) !important;
    stroke: rgba(148, 163, 184, 0.38) !important;
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.08)) !important;
}

.hex-tile:hover .hex-pod-shape,
.hex-tile.hex-active-popout .hex-pod-shape {
    fill: rgba(22, 32, 50, 0.94) !important;
    stroke: rgba(255, 255, 255, 0.65) !important;
    filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.3)) !important;
}

html.light .hex-tile:hover .hex-pod-shape,
html.light .hex-tile.hex-active-popout .hex-pod-shape {
    fill: #ffffff !important;
    stroke: rgba(15, 23, 42, 0.50) !important;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.15)) !important;
}

/* Sensor Active Accents */
.hex-tile[data-sensor="soil"]:hover .hex-pod-shape,
.hex-tile[data-sensor="soil"].is-active .hex-pod-shape {
    stroke: #10b981 !important;
    filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.55)) !important;
}
.hex-tile[data-sensor="water"]:hover .hex-pod-shape,
.hex-tile[data-sensor="water"].is-active .hex-pod-shape {
    stroke: #0284c7 !important;
    filter: drop-shadow(0 0 12px rgba(2, 132, 199, 0.55)) !important;
}
.hex-tile[data-sensor="humidity"]:hover .hex-pod-shape,
.hex-tile[data-sensor="humidity"].is-active .hex-pod-shape {
    stroke: #06b6d4 !important;
    filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.55)) !important;
}
.hex-tile[data-sensor="temperature"]:hover .hex-pod-shape,
.hex-tile[data-sensor="temperature"].is-active .hex-pod-shape {
    stroke: #f59e0b !important;
    filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.55)) !important;
}
.hex-tile[data-sensor="relay"]:hover .hex-pod-shape,
.hex-tile[data-sensor="relay"].is-active .hex-pod-shape {
    stroke: #10b981 !important;
    filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.55)) !important;
}

/* Anti-Wrap Guard for Bio-Telemetry Deck */
#telemetry-drawer .mono span,
#telemetry-drawer .chart-legend span,
#telemetry-drawer .telemetry-table th,
#telemetry-drawer .telemetry-table td {
    white-space: nowrap !important;
}


    </style>

    <!-- Hidden backwards-compatible bridge targets for JS -->
    <div style="display: none;">
        <span class="beacon-dot offline" id="ribbon-beacon"></span>
        <span id="ribbon-status-badge"></span>
        <span id="ribbon-mode-badge"></span>
        <span id="ribbon-heartbeat"></span>
        <span id="dash-active-plant-text"></span>
    </div>

    <!-- 1. Central 3D Digital Twin Viewport (Full Biological & Weather Twin Stage >= 80% screen area) -->
    <div id="digital-twin-viewport" class="digital-twin-viewport">
        <!-- 3D Scene Host (No data-garden-ready to allow immediate clean boot) -->
        <div id="garden3d" class="garden3d" aria-label="Interactive smart garden 3D model">
            <div class="garden3d-stage" tabindex="0" aria-label="Drag to rotate, scroll to zoom."></div>
            
            <!-- Floating Stage Controls (Bottom Left) -->
            
        <!-- 1. Precision 3-Tier Time & Weather Card (Top-Left 3D Stage) -->
        <div class="hud-weather-clock hud-3tier-weather-card frosted-glass" id="hud-weather-clock" style="position: absolute; top: 14px; left: 16px; z-index: 55; width: 390px; max-width: calc(100vw - 32px); height: auto; display: flex; flex-direction: column; gap: 6px; padding: 8px 12px 10px 12px; border-radius: 14px; box-sizing: border-box; overflow: visible;">
            <!-- TIER 1: Real-time Digital Clock & Date -->
            <div class="hud-tier1-clock" id="hud-tier1-clock" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); white-space: nowrap;">
                <div class="sw-time-group" title="System Live Time" style="display: inline-flex; align-items: center; gap: 6px;">
                    <span class="beacon-dot online"></span>
                    <span id="hud-live-time" class="sw-time-val mono tabular-nums" style="font-size: 14px; font-weight: 700; color: var(--text-main);">--:--:--</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
                    <span class="sw-hairline-sep-v">·</span>
                    <span id="hud-live-date" class="sw-date-val">LIVE DATE</span>
                </div>
            </div>

            <!-- TIER 2: Live Local Weather & Location Station (Dual Elegant Glass Pills, Zero Squeeze) -->
            <div class="hud-tier2-weather" id="hud-tier2-weather" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
                <!-- Location Pill Button -->
                <button type="button" class="sw-pill-btn" id="sw-location-toggle" onclick="toggleWeatherLocationPicker(event)" title="Change weather location" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 9999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.10); color: var(--text-main); cursor: pointer; box-sizing: border-box; white-space: nowrap; transition: all 0.2s ease;">
                    <span class="sw-location-icon" style="font-size: 11px;">📍</span>
                    <span id="hud-location-name" class="sw-location-name" style="font-size: 11px; font-weight: 600; white-space: nowrap;">Ho Chi Minh City</span>
                    <svg viewBox="0 0 24 24" class="sw-location-caret" style="width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- Weather Status Pill Button (Unfolds Tier 3) -->
                <button type="button" class="sw-pill-btn" onclick="toggleDailyForecast(event)" title="View 24h weather forecast" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 9999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.10); color: var(--text-main); cursor: pointer; justify-content: flex-end; box-sizing: border-box; white-space: nowrap; transition: all 0.2s ease;">
                    <span id="hud-weather-icon-wrap" class="sw-weather-icon" style="display: inline-flex; align-items: center;">
                        <svg viewBox="0 0 24 24" id="hud-weather-svg" class="apple-weather-svg" style="width: 13px; height: 13px; stroke: #f59e0b; fill: none; stroke-width: 2.2;"><circle cx="12" cy="12" r="4.5"></circle><line x1="12" y1="2" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"></line><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"></line><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"></line></svg>
                    </span>
                    <span id="hud-weather-temp" class="sw-temp-val mono" style="font-size: 11px; font-weight: 700; color: #10b981;">--°C</span>
                    <span class="sw-bullet" style="opacity: 0.4; font-size: 9px;">·</span>
                    <span id="hud-weather-condition" class="sw-cond-val" style="font-size: 10.5px; font-weight: 600; white-space: nowrap;">Checking...</span>
                    <svg viewBox="0 0 24 24" id="forecast-chevron" class="sw-chevron" style="width: 11px; height: 11px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0; transition: transform 0.25s ease;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>

            <!-- Location Search & Quick Pills Popover (Floats directly below location trigger) -->
            <div class="sw-location-popover frosted-glass" id="sw-location-popover" style="display: none; position: absolute; top: calc(100% + 8px); left: 0; z-index: 60;" onclick="event.stopPropagation()">
                <div class="sw-search-wrap">
                    <input type="text" id="input-weather-search" class="sw-weather-search-input" placeholder="Search city or province..." oninput="onWeatherSearchInput(this.value)">
                </div>
                <div class="sw-location-chips" id="sw-location-quick-chips">
                    <button type="button" class="sw-loc-chip active" onclick="selectWeatherCity('Ho Chi Minh City', 10.8231, 106.6297)">Ho Chi Minh City</button>
                    <button type="button" class="sw-loc-chip" onclick="selectWeatherCity('Vinh Long', 10.2537, 105.9722)">Vinh Long</button>
                    <button type="button" class="sw-loc-chip" onclick="selectWeatherCity('Ben Tre', 10.2415, 106.3759)">Ben Tre</button>
                    <button type="button" class="sw-loc-chip" onclick="selectWeatherCity('Ha Noi', 21.0285, 105.8542)">Ha Noi</button>
                    <button type="button" class="sw-loc-chip" onclick="selectWeatherCity('Da Lat', 11.9404, 108.4583)">Da Lat</button>
                    <button type="button" class="sw-loc-chip" onclick="selectWeatherCity('Can Tho', 10.0452, 105.7469)">Can Tho</button>
                </div>
            </div>

            <!-- TIER 3: Hidden Collapsible 24h Forecast Dropdown Tier (Unfolds on demand) -->
            <div class="hud-tier3-forecast" id="hud-forecast-dropdown" style="display: none; border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 8px; margin-top: 2px;" onclick="event.stopPropagation()">
                <div class="hud-forecast-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 10.5px; width: 100%; box-sizing: border-box;">
                    <span class="forecast-title" style="font-weight: 700; color: var(--text-main); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Forecast</span>
                    <div class="forecast-metrics" style="display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 9.5px; white-space: nowrap;">
                        <span>💧 <span id="hud-weather-humidity">68%</span></span>
                        <span style="opacity: 0.4;">·</span>
                        <span>🌧️ <span id="hud-weather-rain-prob">15%</span></span>
                        <span style="opacity: 0.4;">·</span>
                        <span id="hud-weather-sun-rating" class="badge-pill badge-glass mono" style="font-size: 8.5px; padding: 1px 4px;">UV 6</span>
                    </div>
                </div>

                <div class="hud-forecast-milestones-grid" id="hud-milestones-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <div class="hud-milestone-pill" style="text-align: center; padding: 4px 2px; background: rgba(148, 163, 184, 0.08); border-radius: 8px;">
                        <span class="hud-milestone-time" style="display: block; font-size: 9px; opacity: 0.7;">08:00</span>
                        <span class="hud-milestone-temp mono" id="ms-temp-08" style="display: block; font-size: 11px; font-weight: 700; color: #10b981;">27°C</span>
                        <span class="hud-milestone-uv" id="ms-uv-08" style="display: block; font-size: 8.5px; opacity: 0.6;">Morning</span>
                    </div>
                    <div class="hud-milestone-pill" style="text-align: center; padding: 4px 2px; background: rgba(148, 163, 184, 0.08); border-radius: 8px;">
                        <span class="hud-milestone-time" style="display: block; font-size: 9px; opacity: 0.7;">12:00</span>
                        <span class="hud-milestone-temp mono" id="ms-temp-12" style="display: block; font-size: 11px; font-weight: 700; color: #f59e0b;">32°C</span>
                        <span class="hud-milestone-uv" id="ms-uv-12" style="display: block; font-size: 8.5px; opacity: 0.6;">Peak</span>
                    </div>
                    <div class="hud-milestone-pill" style="text-align: center; padding: 4px 2px; background: rgba(148, 163, 184, 0.08); border-radius: 8px;">
                        <span class="hud-milestone-time" style="display: block; font-size: 9px; opacity: 0.7;">16:00</span>
                        <span class="hud-milestone-temp mono" id="ms-temp-16" style="display: block; font-size: 11px; font-weight: 700; color: #10b981;">30°C</span>
                        <span class="hud-milestone-uv" id="ms-uv-16" style="display: block; font-size: 8.5px; opacity: 0.6;">Breeze</span>
                    </div>
                    <div class="hud-milestone-pill" style="text-align: center; padding: 4px 2px; background: rgba(148, 163, 184, 0.08); border-radius: 8px;">
                        <span class="hud-milestone-time" style="display: block; font-size: 9px; opacity: 0.7;">20:00</span>
                        <span class="hud-milestone-temp mono" id="ms-temp-20" style="display: block; font-size: 11px; font-weight: 700; color: #06b6d4;">26°C</span>
                        <span class="hud-milestone-uv" id="ms-uv-20" style="display: block; font-size: 8.5px; opacity: 0.6;">Night</span>
                    </div>
                </div>
                <span id="hud-weather-range" style="display: none;">Forecast: 24°–32°C</span>
            </div>

            <!-- Compatibility elements for tests -->
            <button type="button" class="hud-location-selector-btn" id="btn-weather-location" onclick="event.stopPropagation(); toggleWeatherLocationPicker();" style="display: none;"></button>
            <button type="button" class="hud-forecast-toggle-btn" id="btn-toggle-forecast" onclick="toggleDailyForecast()" style="display: none;">Forecast</button>
        </div>

        <!-- Hidden bridge elements for backward JS compatibility -->
        <div id="hud-island-microclimate" style="display: none;"><span id="hud-vpd-val">--</span></div>
        <div id="hud-island-system" style="display: none;"><span id="hud-tank-summary">--</span><span id="hud-spray-stat">Mist: Standby</span></div>

        <!-- Dynamic Optical Callout Beam SVG Overlay (Connects 3D Sensor directly to Hexagon HUD) -->
        <svg id="hud-callout-svg" class="hud-callout-svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 52;">
            <defs>
                <linearGradient id="callout-beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.9" />
                    <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.7" />
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.2" />
                </linearGradient>
                <filter id="glow-callout" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path id="callout-path-glow" d="" fill="none" stroke="url(#callout-beam-grad)" stroke-width="3" filter="url(#glow-callout)" opacity="0" />
            <path id="callout-path-core" d="" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0" />
            <circle id="callout-origin-node" cx="-100" cy="-100" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5" opacity="0" />
        </svg>

        <!-- 3D Studio Single Micro-Bar (Collapsible + Auto-Spin + X-Pan Slider + Center Reset) -->
        <div class="g3d-studio-dock" id="g3d-studio-dock" style="position: absolute; bottom: 18px; left: 88px; z-index: 45; touch-action: none;">
            <div class="garden3d-micro-bar frosted-glass" id="garden3d-micro-bar">
                <span class="g3d-drag-handle" id="g3d-drag-handle" title="Drag to move 3D Controls">
                    <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2;"><circle cx="9" cy="6" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="18" r="1.5"></circle><circle cx="15" cy="6" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="18" r="1.5"></circle></svg>
                </span>
                
                <div class="g3d-dock-controls" id="g3d-dock-controls" style="display: inline-flex; align-items: center; gap: 7px;">
                    <span class="micro-bar-sep">|</span>
                    <button type="button" class="micro-bar-btn" id="btn-360-spin" onclick="if(window.Garden3D) Garden3D.toggleAutoRotate();" title="Toggle 360° Continuous Orbit">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                        <span>Spin</span>
                    </button>
                    <span class="micro-bar-sep">|</span>
                    <button type="button" class="pan-step-btn" id="btn-pan-left" onclick="if(window.Garden3D) Garden3D.panStep(-0.2); if(window.updatePanBadge) updatePanBadge(window.Garden3D.getPanOffset());" title="Shift Model Left">◀</button>
                    <input type="range" class="pan-slider" id="slider-3d-pan" min="-1.5" max="1.5" step="0.1" value="0" oninput="if(window.Garden3D) Garden3D.setPanOffset(parseFloat(this.value)); if(window.updatePanBadge) updatePanBadge(this.value);" title="Slide to pan 3D Model horizontally (-1.5m to +1.5m)">
                    <button type="button" class="pan-step-btn" id="btn-pan-right" onclick="if(window.Garden3D) Garden3D.panStep(0.2); if(window.updatePanBadge) updatePanBadge(window.Garden3D.getPanOffset());" title="Shift Model Right">▶</button>
                    <button type="button" class="pan-reset-btn" id="btn-pan-reset" onclick="if(window.Garden3D) Garden3D.resetPan(); if(window.updatePanBadge) updatePanBadge(0);" title="Reset Model to Center (0.0m)">Center</button>
                    <span class="pan-val-badge mono" id="pan-val-badge">0.0m</span>
                </div>

                <span class="micro-bar-sep">|</span>
                <!-- Collapse / Expand toggle button -->
                <button type="button" class="micro-bar-toggle-btn" id="btn-toggle-studio-bar" onclick="toggleStudioDock()" title="Collapse / Expand 3D Studio Dock">
                    <span id="studio-toggle-icon">◀</span>
                </button>
            </div>
            <!-- Hidden backward-compatibility anchors for tests if needed -->
            <div style="display: none;">
                <button id="btn-cam-home" onclick="if(window.Garden3D) Garden3D.home();"></button>
                <button id="btn-cam-canopy" onclick="if(window.Garden3D) Garden3D.focusSensor('soil');"></button>
                <button id="btn-cam-uno" onclick="if(window.Garden3D) Garden3D.focusSensor('relay');"></button>
                <button id="btn-cam-tank" onclick="if(window.Garden3D) Garden3D.focusSensor('water');"></button>
                <button id="btn-cam-top" onclick="if(window.Garden3D) Garden3D.focus('top');"></button>
            </div>
        </div>

        
        </div>

            <div class="garden3d-stage-controls" style="display: none;">
                <button type="button" class="stage-btn-pill" id="btn-3d-rotate" onclick="if(window.Garden3D) Garden3D.toggleAutoRotate();" title="Toggle Auto-Rotation">
                    <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                    <span>Auto Rotate</span>
                </button>
                <span style="opacity: 0.4;">|</span>
                <button type="button" class="stage-btn-pill" id="btn-3d-reset" onclick="if(window.Garden3D) Garden3D.home();" title="Reset Camera Perspective">
                    <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                    <span>Reset View</span>
                </button>
                <span style="opacity: 0.4;">|</span>
                <span style="font-size: 10.5px; opacity: 0.75;" class="garden3d-status">Drag to orbit 360° · Scroll to zoom</span>
            </div>
        <!-- The control capsule and sensor cards share the 3D viewport coordinate space. -->

        <!-- 2. Floating Action Capsule (Dock at top edge) -->
        <div id="floating-action-capsule" class="floating-action-capsule frosted-glass">
            <button type="button" class="btn-quick-spray" id="btn-quick-spray" title="Quick Spray (10s)">
                <div id="quick-spray-ring" class="quick-spray-ring" data-stroke-dashoffset="0">
                    <svg viewBox="0 0 36 36" class="spray-circular-svg">
                        <circle class="spray-ring-bg" cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(16, 185, 129, 0.2)" stroke-width="2.8" />
                        <circle class="spray-ring-progress" id="quick-spray-circle-path" cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" stroke-width="2.8" stroke-dasharray="100, 100" stroke-dashoffset="0" />
                    </svg>
                </div>
                <span id="quick-spray-counter" class="mono">10s</span>
            </button>

            <div class="capsule-divider"></div>

            <button type="button" class="capsule-switch-auto" id="btn-toggle-mode" title="Toggle Auto / Manual">AUTO</button>

            <div class="capsule-divider"></div>

            <div class="capsule-plant-wrap">
                <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: #10b981; fill: none; stroke-width: 2;"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path><path d="M12 6v12M8 10l4-4 4 4"></path></svg>
                <select id="capsule-plant-selector" class="capsule-select" title="Target Plant Species">
                    <option value="1" selected>Boston Fern</option>
                    <option value="2">Moth Orchid</option>
                    <option value="3">Cherry Tomato</option>
                    <c:if test="${not empty allPlants}">
                        <c:forEach var="p" items="${allPlants}">
                            <option value="${p.plantId}">${p.plantName} (${p.humidityOn}% - ${p.humidityOff}%)</option>
                        </c:forEach>
                    </c:if>
                </select>
            </div>

            <div class="capsule-divider"></div>

            <div id="capsule-conn-badge" class="badge-connected liquid-btn" title="Hardware Connection Status" onclick="if(typeof openConnectModal==='function'){openConnectModal();}else{openModal('modal-connect-hardware');}" style="cursor: pointer;">
                <span class="pulse-dot" id="capsule-pulse-dot"></span>
                <span id="capsule-conn-text">OFFLINE</span>
            </div>

            <button type="button" id="btn-open-drawer" class="capsule-drawer-trigger" title="Open Telemetry Analytics Drawer" onclick="openTelemetryDrawer()">
                <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M3 3v18h18"></path><polyline points="7 14 11 10 15 14 21 6"></polyline></svg>
                <span>Telemetry</span>
            </button>

            <div class="capsule-divider"></div>

            <!-- Pump Actuation Cluster (START & STOP with Safety Interlocks) -->
            <div class="capsule-actuation-cluster" id="capsule-actuation-cluster" title="Pump controls with firmware temperature, soil and water interlocks">
                <button type="button" class="capsule-pump-btn capsule-pump-start" id="capsule-btn-start" onclick="handleCapsuleStartPump()" title="Start Mist Pump">
                    <svg viewBox="0 0 24 24" style="width: 10px; height: 10px; fill: currentColor;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>START</span>
                </button>
                <button type="button" class="capsule-pump-btn capsule-pump-stop disabled" id="capsule-btn-stop" onclick="handleCapsuleStopPump()" title="Stop Mist Pump">
                    <svg viewBox="0 0 24 24" style="width: 9px; height: 9px; fill: currentColor;"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                    <span>STOP</span>
                </button>
            </div>
        </div>

        <!-- 3. Four live Arduino sensors: soil, reservoir, DHT11 humidity, DHT11 temperature -->
        <div id="organic-hex-cluster" class="organic-hex-cluster honeycomb-grid">
            <!-- Top Row: 2 Hexagons (Soil Moisture, Water Reservoir) -->
            <div class="hex-row hex-row-top">
                <!-- Tile 1: Soil Moisture -->
                <div class="hex-tile" data-sensor="soil" title="Soil Moisture Probe (Click to inspect)">
                    <svg class="hex-border-svg" viewBox="0 0 86 98">
                        <path class="hex-pod-shape" d="M 43,3 L 83,26 L 83,72 L 43,95 L 3,72 L 3,26 Z" stroke-linejoin="round" />
                    </svg>
                    <div class="hex-content">
                        <div class="hex-header-row">
                            <span class="hex-tag">SOIL</span>
                            <span class="pulse-dot offline" id="pod-soil-dot" title="Optimal Substrate Hydration"></span>
                        </div>
                        <div class="hex-metric-row">
                            <span class="bento-val mono hex-val" id="stat-soil-moisture">--</span>
                            <span class="hex-unit">%</span>
                        </div>
                        <div class="hex-bar-track">
                            <div class="hex-bar-fill" id="pod-soil-bar" style="width: 0%;"></div>
                        </div>
                    </div>
                </div>

                <!-- Tile 2: Water Reservoir -->
                <div class="hex-tile" data-sensor="water" title="Water Reservoir Tank (Click to inspect)">
                    <svg class="hex-border-svg" viewBox="0 0 86 98">
                        <path class="hex-pod-shape" d="M 43,3 L 83,26 L 83,72 L 43,95 L 3,72 L 3,26 Z" stroke-linejoin="round" />
                    </svg>
                    <div class="hex-content">
                        <div class="hex-header-row">
                            <span class="hex-tag">TANK</span>
                            <span class="pulse-dot offline" id="pod-tank-dot" title="Reservoir Capacity"></span>
                        </div>
                        <div class="hex-metric-row">
                            <span class="bento-val mono hex-val" id="stat-tank-val">--</span>
                            <span class="hex-unit">%</span>
                        </div>
                        <div class="hex-bar-track">
                            <div class="hex-bar-fill" id="pod-tank-bar" style="width: 0%;"></div>
                        </div>
                        <div id="pod-water-tube" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <!-- Bottom Row: 2 Hexagons (Air Humidity, Ambient Temperature) -->
            <div class="hex-row hex-row-bottom">
                <!-- Tile 3: Chamber Relative Humidity (DHT11) -->
                <div class="hex-tile" data-sensor="humidity" title="Chamber Air Humidity / DHT11 (Click to inspect)">
                    <svg class="hex-border-svg" viewBox="0 0 86 98">
                        <path class="hex-pod-shape" d="M 43,3 L 83,26 L 83,72 L 43,95 L 3,72 L 3,26 Z" stroke-linejoin="round" />
                    </svg>
                    <div class="hex-content">
                        <div class="hex-header-row">
                            <span class="hex-tag">AIR HUM</span>
                            <span class="pulse-dot offline" id="pod-rain-dot" title="Chamber Humidity"></span>
                        </div>
                        <div class="hex-metric-row">
                            <span class="bento-val mono hex-val" id="stat-air-hum">--</span>
                            <span class="hex-unit">%</span>
                        </div>
                        <div class="hex-bar-track" title="Air humidity (0-100%)"><div class="hex-bar-fill" id="pod-air-hum-bar" style="width:0%;background:#8b5cf6;"></div></div>
                        <div class="hex-icon-box" id="rain-icon-container" style="display:none">
                            <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: #06b6d4; fill: none; stroke-width: 2;">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                            </svg>
                        </div>
                        <span id="stat-rain-state" style="display: none;">DRY</span>
                        <span id="pod-rain-badge" style="display: none;"></span>
                    </div>
                </div>

                <!-- Tile 4: Ambient Temperature -->
                <div class="hex-tile" data-sensor="temperature" title="Ambient Climate / Temperature (Click to inspect)">
                    <svg class="hex-border-svg" viewBox="0 0 86 98">
                        <path class="hex-pod-shape" d="M 43,3 L 83,26 L 83,72 L 43,95 L 3,72 L 3,26 Z" stroke-linejoin="round" />
                    </svg>
                    <div class="hex-content">
                        <div class="hex-header-row">
                            <span class="hex-tag">TEMP</span>
                            <span class="pulse-dot offline" id="pod-climate-dot" title="Thermal Status"></span>
                        </div>
                        <div class="hex-metric-row">
                            <span class="bento-val mono hex-val" id="stat-air-temp">--</span>
                            <span class="hex-unit">°C</span>
                        </div>
                        <div class="hex-bar-track" title="Air temperature (0-50°C)"><div class="hex-bar-fill" id="pod-temp-bar" style="width:0%;background:#f59e0b;"></div></div>
                        <div id="pod-climate-sub" class="hex-subtext" style="display:none">
                            <span id="stat-air-subtext" style="font-size: 9.5px; color: var(--text-muted);">--</span>
                        </div>
                    </div>
                </div>

           

            <!-- Fifth status tile: actual mist pump state from Arduino (Matches Original UI: MIST / IDLE) -->
                <div class="hex-tile" data-sensor="relay" title="Misting Status (Live from Arduino)">
                    <svg class="hex-border-svg" viewBox="0 0 86 98" aria-hidden="true">
                        <path class="hex-pod-shape" d="M 43,3 L 83,26 L 83,72 L 43,95 L 3,72 L 3,26 Z" stroke-linejoin="round" />
                    </svg>
                    <div class="hex-content">
                        <div class="hex-header-row">
                            <span class="hex-tag">MIST</span>
                            <span class="pulse-dot offline" id="pod-pump-dot" title="Mist Pump Status"></span>
                        </div>
                        <div class="hex-metric-row">
                            <span class="bento-val mono hex-val" id="stat-pump-state" aria-live="polite">IDLE</span>
                        </div>
                        <div class="hex-bar-track" aria-hidden="true">
                            <div class="hex-bar-fill" id="pod-pump-bar" style="width: 0%; background: #10b981;"></div>
                        </div>
                        <div class="hex-icon-box" id="mist-icon-container" style="display: flex; justify-content: center; align-items: center; margin-top: 2px;">
                            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;">
                                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    
<div class="ai-farmer-companion" id="ai-farmer-companion" title="Click to consult Dr. Flora AI Agronomist">
<!-- Authentic Animated Vietnamese Farmer Mascot (Dual State: Idle Sweeper vs Scooter Rider) -->
<div class="farmer-avatar-btn is-idle" id="farmer-avatar-btn" onclick="toggleAiChatBot()" title="Dr. Flora AI Mascot — Click to chat">
<!-- State 1: IDLE — Farmer rhythmically sweeping grass with swaying lawn tufts -->
<svg viewBox="0 0 64 64" class="farmer-mascot-svg farmer-idle-svg" id="farmer-idle-svg" style="width: 48px; height: 48px; display: block;">
<defs>
<linearGradient id="hatGradIdle" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#fef08a" />
<stop offset="60%" stop-color="#eab308" />
<stop offset="100%" stop-color="#ca8a04" />
</linearGradient>
<linearGradient id="shirtGradIdle" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#334155" />
<stop offset="100%" stop-color="#0f172a" />
</linearGradient>
</defs>
<!-- Ground Shadow -->
<ellipse cx="32" cy="59" rx="19" ry="3.5" fill="rgba(0, 0, 0, 0.35)" />

<!-- Swaying Grass Tufts at feet -->
<g class="farmer-grass-tufts">
<path class="grass-blade-1" d="M14 59 Q12 52 9 50 Q13 54 16 59 Z" fill="#22c55e" />
<path class="grass-blade-2" d="M18 59 Q19 50 23 48 Q20 54 20 59 Z" fill="#16a34a" />
<path class="grass-blade-3" d="M46 59 Q48 51 52 49 Q48 54 48 59 Z" fill="#22c55e" />
<path class="grass-blade-4" d="M43 59 Q42 53 39 51 Q42 55 45 59 Z" fill="#15803d" />
</g>

<!-- Legs -->
<rect x="25" y="52" width="5" height="7" rx="2" fill="#0f172a" />
<rect x="34" y="52" width="5" height="7" rx="2" fill="#0f172a" />

<!-- Farmer Body (Traditional Garment) -->
<path d="M22 34 Q32 37 42 34 L43 53 Q32 55 21 53 Z" fill="url(#shirtGradIdle)" />
<!-- Emerald Sash Belt -->
<rect x="23" y="44" width="18" height="3" rx="1.5" fill="#10b981" />

<!-- Farmer Head & Cute Friendly Face -->
<circle cx="32" cy="25" r="8.5" fill="#fcd34d" />
<!-- Smiling Eyes -->
<path d="M28 24 Q30 22 32 24" fill="none" stroke="#451a03" stroke-width="1.5" stroke-linecap="round" />
<path d="M34 24 Q36 22 38 24" fill="none" stroke="#451a03" stroke-width="1.5" stroke-linecap="round" />
<!-- Cheerful Smile -->
<path d="M30 28 Q32.5 31 35 28" fill="none" stroke="#b91c1c" stroke-width="1.4" stroke-linecap="round" />
<!-- Rosy Cheeks -->
<circle cx="27" cy="27" r="1.6" fill="#f87171" opacity="0.65" />
<circle cx="37" cy="27" r="1.6" fill="#f87171" opacity="0.65" />

<!-- Traditional Conical Hat -->
<polygon points="32,4 10,20 54,20" fill="url(#hatGradIdle)" stroke="#a16207" stroke-width="1" />
<line x1="10" y1="20" x2="54" y2="20" stroke="#854d0e" stroke-width="1.8" stroke-linecap="round" />
<line x1="32" y1="4" x2="22" y2="20" stroke="#ca8a04" stroke-width="0.7" opacity="0.5" />
<line x1="32" y1="4" x2="42" y2="20" stroke="#ca8a04" stroke-width="0.7" opacity="0.5" />
<line x1="32" y1="4" x2="32" y2="20" stroke="#ca8a04" stroke-width="0.7" opacity="0.5" />

<!-- Sweeping Broom Arm (rhythmically sweeping back and forth) -->
<g class="farmer-broom-arm" id="farmer-broom-arm">
<!-- Hand / Arm -->
<path d="M38 36 Q44 38 47 43" fill="none" stroke="#fcd34d" stroke-width="2.8" stroke-linecap="round" />
<!-- Bamboo Broom Handle -->
<line x1="48" y1="28" x2="55" y2="57" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
<!-- Straw Broom Bristles -->
<path d="M52 54 L60 57 L57 61 L50 58 Z" fill="#d97706" stroke="#b45309" stroke-width="0.8" />
<line x1="53" y1="55" x2="58" y2="59" stroke="#92400e" stroke-width="0.6" />
<line x1="51" y1="57" x2="56" y2="60" stroke="#92400e" stroke-width="0.6" />
<!-- Drifting Leaf particles -->
<circle class="flying-leaf-1" cx="58" cy="53" r="1.4" fill="#4ade80" />
<circle class="flying-leaf-2" cx="61" cy="50" r="1.2" fill="#22c55e" />
</g>
<circle cx="23" cy="38" r="2" fill="#fcd34d" />
</svg>

<!-- State 2: RIDING — Farmer riding mini scooter with spinning wheels, headlight beam & exhaust smoke -->
<svg viewBox="0 0 64 64" class="farmer-mascot-svg farmer-riding-svg" id="farmer-riding-svg" style="width: 48px; height: 48px; display: none;">
<defs>
<linearGradient id="scooterBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#10b981" />
<stop offset="100%" stop-color="#047857" />
</linearGradient>
<linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stop-color="rgba(254, 240, 138, 0.65)" />
<stop offset="100%" stop-color="rgba(254, 240, 138, 0)" />
</linearGradient>
</defs>
<!-- Ground Shadow -->
<ellipse cx="32" cy="60" rx="22" ry="3" fill="rgba(0, 0, 0, 0.35)" />

<!-- Headlight Beam Cone -->
<polygon class="scooter-headlight-beam" points="52,43 64,36 64,50" fill="url(#headlightBeam)" />

<!-- Exhaust Smoke Puffs -->
<g class="scooter-exhaust-smoke">
<circle class="smoke-puff-1" cx="6" cy="50" r="2.5" fill="rgba(203, 213, 225, 0.7)" />
<circle class="smoke-puff-2" cx="2" cy="47" r="3.5" fill="rgba(148, 163, 184, 0.45)" />
</g>

<!-- Mini Scooter Chassis -->
<g class="scooter-chassis">
<!-- Rear & Front Mudguards / Body -->
<path d="M10 52 Q14 44 24 48 L36 48 L46 42 L48 45 L42 52 Z" fill="url(#scooterBodyGrad)" stroke="#065f46" stroke-width="1" />
<!-- Scooter Floorboard -->
<rect x="22" y="50" width="16" height="3" rx="1.5" fill="#334155" />
<!-- Handlebar Column & Steering -->
<line x1="45" y1="43" x2="42" y2="30" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" />
<circle cx="42" cy="29" r="2.2" fill="#e2e8f0" />
<!-- Headlight Lamp -->
<ellipse cx="49" cy="43" rx="3" ry="2.2" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8" />
</g>

<!-- Rear Wheel Assembly (Fully visible, detailed tire, rim, hub & spinning spokes) -->
<g class="wheel-mount-rear" transform="translate(14, 53)">
<circle cx="0" cy="0" r="6.5" fill="#0f172a" stroke="#475569" stroke-width="1.3" />
<circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#64748b" stroke-width="0.8" />
<g class="scooter-spokes-spin">
<line x1="-3.8" y1="0" x2="3.8" y2="0" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="0" y1="-3.8" x2="0" y2="3.8" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" stroke="#e2e8f0" stroke-width="0.9" />
</g>
<circle cx="0" cy="0" r="1.8" fill="#cbd5e1" stroke="#334155" stroke-width="0.5" />
</g>

<!-- Front Wheel Assembly (Fully visible, detailed tire, rim, hub & spinning spokes) -->
<g class="wheel-mount-front" transform="translate(48, 53)">
<circle cx="0" cy="0" r="6.5" fill="#0f172a" stroke="#475569" stroke-width="1.3" />
<circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#64748b" stroke-width="0.8" />
<g class="scooter-spokes-spin">
<line x1="-3.8" y1="0" x2="3.8" y2="0" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="0" y1="-3.8" x2="0" y2="3.8" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" stroke="#e2e8f0" stroke-width="0.9" />
<line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" stroke="#e2e8f0" stroke-width="0.9" />
</g>
<circle cx="0" cy="0" r="1.8" fill="#cbd5e1" stroke="#334155" stroke-width="0.5" />
</g>

<!-- Farmer Riding: Leaning Forward, Hands on Handlebar -->
<g class="farmer-rider-body">
<!-- Rider Torso -->
<path d="M22 35 Q30 36 38 34 L36 48 L24 49 Z" fill="#1e293b" />
<!-- Legs on scooter floor -->
<path d="M28 46 L34 49 L32 52" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
<!-- Arms forward holding handlebars -->
<path d="M32 36 Q38 34 42 30" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" />

<!-- Farmer Head & Face -->
<circle cx="30" cy="24" r="8" fill="#fcd34d" />
<!-- Winking Riding Smile -->
<path d="M27 23 Q29 21 31 23" fill="none" stroke="#451a03" stroke-width="1.4" stroke-linecap="round" />
<circle cx="34" cy="23" r="1.4" fill="#451a03" />
<path d="M28 27 Q31 29 34 27" fill="none" stroke="#b91c1c" stroke-width="1.4" stroke-linecap="round" />
<circle cx="26" cy="26" r="1.4" fill="#f87171" opacity="0.65" />
<circle cx="35" cy="26" r="1.4" fill="#f87171" opacity="0.65" />

<!-- Conical Hat tilted back in the wind -->
<polygon points="30,5 9,20 50,18" fill="url(#hatGradIdle)" stroke="#a16207" stroke-width="1" />
<line x1="9" y1="20" x2="50" y2="18" stroke="#854d0e" stroke-width="1.6" stroke-linecap="round" />
</g>
</svg>
<span class="farmer-pulse-badge"></span>
</div>
</div>



<!-- 7. Compact High-Tech Bio-Tech Glass Pod Assistant (#ai-chat-card) -->
<div class="ai-chat-card frosted-glass compact-biotech-pod" id="ai-chat-card" style="display: none;">
<!-- Subtle Botanical Leaf Vein Watermark in Header -->
<div class="biotech-header-watermark">
<svg viewBox="0 0 100 100" class="leaf-watermark-svg" style="width: 100%; height: 100%; pointer-events: none;">
<path d="M50 5 Q75 30 70 70 Q50 95 30 70 Q25 30 50 5 Z" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="2" />
<line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1.5" />
</svg>
</div>

<div class="ai-chat-header" id="ai-chat-header">
<div style="display: flex; align-items: center; gap: 9px; cursor: grab; flex: 1;">
<div class="ai-avatar-badge">
<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: #10b981; fill: none; stroke-width: 2.2;"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path><path d="M12 6v12M8 10l4-4 4 4"></path></svg>
</div>
<div>
<h4 class="ai-chat-title">Dr. Flora | AI Agronomist</h4>
<span class="ai-chat-sub" id="ai-status-sub" style="font-size: 10px; color: #10b981; background: none; border: none; padding: 0;"><span class="beacon-dot online" style="width: 5px; height: 5px; display: inline-block; margin-right: 4px;"></span>Real-Time LLM Intelligence</span>
</div>
</div>
<div style="display: flex; align-items: center; gap: 5px;">
<button type="button" class="btn-chat-tool" id="btn-ai-settings" onclick="toggleAiLlmSettings()" title="Configure LLM API Key &amp; Model">
<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
</button>
<button type="button" class="btn-chat-tool" id="btn-ai-clear" onclick="clearAiChatHistory()" title="Clear Chat History">
<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
</button>
<button type="button" class="btn-chat-tool btn-chat-close" id="btn-close-chat" onclick="toggleAiChatBot(false)" title="Close Assistant (Esc / Click Outside)">
<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
</button>
</div>
</div>

<!-- Slide-down LLM API Settings Drawer -->
<div class="ai-llm-settings-panel" id="ai-llm-settings-panel" style="display: none;">
<div style="font-size: 11px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">&#x2699;&#xFE0F; External LLM Integration</div>
<div style="display: flex; flex-direction: column; gap: 6px;">
<input type="password" id="input-flora-api-key" class="llm-key-input" placeholder="Enter Gemini or OpenAI API Key..." autocomplete="off">
<div style="display: flex; gap: 6px;">
<select id="select-flora-model" class="llm-model-select">
<option value="gemini-1.5-flash" selected>Gemini 1.5 Flash (Google Free AI)</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-fast &amp; Smart)</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Agronomist Reasoning)</option>
</select>
<button type="button" class="btn btn-emerald btn-sm" onclick="saveFloraApiKey()" style="padding: 4px 10px; font-size: 10.5px;">Save</button>
</div>
</div>
</div>

<!-- Quick Action Chips with High-Contrast Tokens -->
<div class="ai-prompt-chips">
<button type="button" class="ai-chip" onclick="sendAiQuickPrompt('health')">
<svg viewBox="0 0 24 24" class="chip-svg" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
<span>Health Audit</span>
</button>
<button type="button" class="ai-chip" onclick="sendAiQuickPrompt('mist')">
<svg viewBox="0 0 24 24" class="chip-svg" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
<span>Mist Advice</span>
</button>
<button type="button" class="ai-chip" onclick="sendAiQuickPrompt('microclimate')">
<svg viewBox="0 0 24 24" class="chip-svg" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
<span>Microclimate</span>
</button>
<button type="button" class="ai-chip" onclick="sendAiQuickPrompt('pump')">
<svg viewBox="0 0 24 24" class="chip-svg" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
<span>Pump Check</span>
</button>
</div>

<!-- Chat Message History -->
<div class="ai-chat-messages" id="ai-chat-messages">
<div class="ai-msg ai-msg-bot">
<div class="ai-msg-bubble">
Hello! I am Dr. Flora, your digital AI agronomist. I monitor your Ludisia discolor terrarium's soil moisture, misting cycles, and microclimate in real time. Ask me anything or select a quick audit above!
</div>
<span class="ai-msg-time">Just now</span>
</div>
</div>

<!-- Typing indicator -->
<div id="ai-typing-indicator" class="ai-typing-indicator" style="display: none;">
<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
<span style="font-size: 10px; margin-left: 6px; color: var(--accent-emerald);">Dr. Flora is analyzing sensor telemetry...</span>
</div>

<!-- Chat Input Footer -->
<form class="ai-chat-input-form" id="ai-chat-form" onsubmit="event.preventDefault(); handleAiChatSubmit();">
<input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="Ask Dr. Flora about plant health, misting schedule..." autocomplete="off">
<button type="submit" class="ai-chat-send-btn liquid-btn" id="btn-ai-send" title="Send message">
<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </form>
        </div>
    </div><!-- /digital-twin-viewport: controls + five status cards remain inside stage -->

        <!-- 4. Morphing UI Frosted Glass Detail Card (Expands when any hexagon is clicked) -->
        <div id="morph-detail-card" class="morph-detail-card frosted-glass">
            <div class="morph-card-inner">
                <div class="detail-card-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="detail-card-icon" id="detail-card-icon">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: #10b981; fill: none; stroke-width: 2.2;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                        </div>
                        <div>
                            <h3 id="detail-card-title" class="detail-card-title">Sensor Detail</h3>
                            <span id="detail-card-badge" class="badge-pill badge-emerald" style="font-size: 9.5px; padding: 2px 8px;">LIVE MONITOR</span>
                        </div>
                    </div>
                    <button type="button" id="btn-close-detail" class="btn-close-detail" title="Close detail card" aria-label="Close detail card" onclick="closeDetailCard()">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div class="detail-card-body">
                    <div id="detail-card-agri-alert" class="detail-card-agri-alert" style="display: none; margin-bottom: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444;"></div>
                    <div class="detail-metric-row">
                        <div id="detail-card-val" class="detail-card-val mono">--</div>
                        <div id="detail-card-safe" class="detail-card-safe">Safe: 40% - 65%</div>
                    </div>

                    <div class="detail-sparkline-wrap">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Telemetry Trend</span>
                            <span style="font-size: 9.5px; color: #10b981;" class="mono">Catmull-Rom Spline</span>
                        </div>
                        <canvas id="detail-card-sparkline" class="sparkline-canvas" width="280" height="60"></canvas>
                    </div>

                    <div class="detail-actions-row">
                        <button type="button" class="btn btn-emerald btn-sm" id="detail-btn-action" onclick="if(window.quickBoostSpray) quickBoostSpray(10);" style="flex: 1; justify-content: center; height: 32px; font-size: 11px; font-weight: 700;">
                            <span>Trigger 10s Mist</span>
                        </button>
                        <button type="button" class="btn btn-glass btn-sm" id="detail-btn-reset-cam" onclick="if(window.Garden3D) Garden3D.home();" style="height: 32px; font-size: 11px;">
                            <span>Reset Camera</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. Slide-Over Frosted Glass History Drawer (Houses #canvasTelemetry & Controls Dock) -->
        <div id="drawer-backdrop" class="drawer-backdrop" onclick="closeTelemetryDrawer()"></div>
        <aside id="telemetry-drawer" class="telemetry-drawer frosted-glass">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border-hairline);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; stroke: #10b981; fill: none; stroke-width: 2.2;"><path d="M3 3v18h18"></path><polyline points="7 14 11 10 15 14 21 6"></polyline></svg>
                    <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">Bio-Telemetry Deck</h3>
                </div>
                <button type="button" class="btn btn-glass btn-sm" id="btn-close-drawer" onclick="closeTelemetryDrawer()" style="padding: 4px 10px; font-size: 11px; font-weight: 700;">
                    ✕ Close
                </button>
            </div>

            <!-- Hidden Sensor KPI Data Anchors (Maintained for Telemetry Model Binding) -->
            

            <!-- TIER 2: Bio-Telemetry Horizon & Multivariate Spline Chart -->
            <div class="glass-card bio-comfort-chart-card" id="dashboard-chart-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">Telemetry Horizon</span>
                        <span class="badge-pill badge-glass mono" id="chart-live-badge" style="font-size: 10px; color: #10b981; border-color: rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;"><span class="beacon-dot online" style="width: 6px; height: 6px;"></span><span>LIVE</span></span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="display: flex; background: var(--bg-input); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); padding: 2px;">
                            <button class="btn btn-sm btn-glass active" data-range="24h" style="padding: 2px 7px; font-size: 9.5px;" onclick="setChartRange('24h', this)">24H</button>
                            <button class="btn btn-sm btn-glass" data-range="6h" style="padding: 2px 7px; font-size: 9.5px;" onclick="setChartRange('6h', this)">6H</button>
                            <button class="btn btn-sm btn-glass" data-range="1h" style="padding: 2px 7px; font-size: 9.5px;" onclick="setChartRange('1h', this)">1H</button>
                        </div>
                        <button class="btn btn-glass btn-sm" style="padding: 2px 7px; font-size: 9.5px; gap: 4px;" onclick="exportTelemetryCSV()" title="Export CSV Data">
                            <svg viewBox="0 0 24 24" style="width: 10px; height: 10px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; font-size: 9.5px; margin-bottom: 8px; flex-wrap: nowrap; overflow-x: hidden;" class="mono chart-legend">
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981; white-space: nowrap !important; flex-shrink: 0;">
                        <span style="width: 8px; height: 3px; background: #10b981; border-radius: 2px;"></span>
                        Soil Hydration (%)
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: #06b6d4; white-space: nowrap !important; flex-shrink: 0;">
                        <span style="width: 8px; height: 3px; background: #06b6d4; border-radius: 2px;"></span>
                        Reservoir Tank (%)
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: #8b5cf6; white-space: nowrap !important; flex-shrink: 0;">
                        <span style="width: 8px; height: 3px; background: #8b5cf6; border-radius: 2px;"></span>
                        Air Humidity (%)
                    </span>
                </div>

                <div style="height: 230px; width: 100%; position: relative;" id="telemetry-chart-wrap">
                    <div id="telemetry-standby-badge" class="telemetry-standby-badge" style="display: none;">
                        <span class="beacon-dot beacon-amber"></span>
                        <span id="telemetry-standby-text">STANDBY · TELEMETRY CACHED</span>
                    </div>
                    <canvas id="canvasTelemetry" width="380" height="230" style="width: 100%; height: 230px; display: block;"></canvas>
                </div>
            </div>

            <!-- TIER 3: Zero-Scroll 2-Tab Segmented Module ([ 📋 Live Log ] | [ ⚙️ Thresholds & Relay ]) -->
            <div class="telemetry-tier3-tabs" id="telemetry-tier3-tabs" style="margin-top: 24px;">
                <div class="tier3-tab-nav">
                    <button type="button" class="tier3-tab-btn active" id="btn-tab-live-log" onclick="switchTier3Tab('log')">
                        <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span style="white-space: nowrap;">Telemetry Log</span>
                        <span class="badge-pill badge-glass mono" id="history-record-count" style="font-size: 9px; padding: 1px 5px;">0 LOGS</span>
                    </button>
                    <button type="button" class="tier3-tab-btn" id="btn-tab-calibration" onclick="switchTier3Tab('calibration')">
                        <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>Thresholds &amp; Relay</span>
                    </button>
                </div>

                <!-- Tab 1: Live Log Pane -->
                <div class="tier3-tab-pane active" id="pane-tab-live-log">
                    <div class="telemetry-table-wrapper" style="height: 100%; max-height: 180px; overflow-y: auto;">
                        <table class="telemetry-data-table" id="telemetry-records-table">
                            <thead>
                                <tr>
                                    <th>TIME</th>
                                    <th>SOIL</th>
                                    <th>TANK</th>
                                    <th>AIR RH</th>
                                    <th>TEMP</th>
                                    <th>PUMP</th>
                                </tr>
                            </thead>
                            <tbody id="telemetry-records-tbody">
                                <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px">No sensor readings received</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tab 2: Calibration & Relay Pane -->
                <div class="tier3-tab-pane" id="pane-tab-calibration" style="display: none;">
                    <div class="calibration-quick-form" style="padding: 10px 4px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Botanical Profile</span>
                            <span class="badge-pill badge-emerald" id="dash-card-mode-badge" style="font-size: 9.5px;">${setting != null && setting.desiredMode == 'MANUAL' ? 'MANUAL' : 'AUTO'}</span>
                        </div>
                        
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="btn btn-sm ${setting == null || setting.desiredMode == 'AUTO' ? 'btn-emerald' : 'btn-glass'}" id="btn-switch-auto" onclick="quickSwitchMode('AUTO')" style="flex: 1; justify-content: center; font-weight: 700; height: 26px; font-size: 10px;">AUTO</button>
                            <button type="button" class="btn btn-sm ${setting != null && setting.desiredMode == 'MANUAL' ? 'btn-amber' : 'btn-glass'}" id="btn-switch-manual" onclick="requestSwitchMode('MANUAL')" style="flex: 1; justify-content: center; font-weight: 700; height: 26px; font-size: 10px;">MANUAL</button>
                        </div>

                        <select id="setting-plant-selector" data-prj-setting="setting-plant-selector" class="input-control" onchange="onSettingPlantSelected(this)" style="width: 100%; height: 26px; font-size: 10.5px; padding: 2px 6px;">
                            <option value="normal" data-name="Ludisia Discolor Profile" data-on="${setting != null ? setting.humidityOn : 55.0}" data-off="${setting != null ? setting.humidityOff : 75.0}" selected>Ludisia Discolor (55.0% - 75.0%)</option>
                            <c:if test="${not empty allPlants}">
                                <optgroup label="Registered Profiles">
                                    <c:forEach var="p" items="${allPlants}">
                                        <option value="${p.plantId}" data-name="${p.plantName}" data-on="${p.humidityOn != null ? p.humidityOn : 55.0}" data-off="${p.humidityOff != null ? p.humidityOff : 75.0}">
                                            ${p.plantName} (${p.humidityOn}% - ${p.humidityOff}%)
                                        </option>
                                    </c:forEach>
                                </optgroup>
                            </c:if>
                        </select>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" for="setting-hum-on" style="font-size: 9.5px;">Min Moisture</label>
                                <input type="number" step="0.5" min="0" max="99" id="setting-hum-on" data-prj-setting="setting-hum-on" class="input-control mono" value="${setting != null ? setting.humidityOn : 55.0}" style="width: 100%; height: 25px; font-size: 10.5px; text-align: center;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" for="setting-hum-off" style="font-size: 9.5px;">Max Moisture</label>
                                <input type="number" step="0.5" min="1" max="100" id="setting-hum-off" data-prj-setting="setting-hum-off" class="input-control mono" value="${setting != null ? setting.humidityOff : 75.0}" style="width: 100%; height: 25px; font-size: 10.5px; text-align: center;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" for="setting-cooldown" style="font-size: 9.5px;">Rest preference (s)</label>
                                <input type="number" min="0" max="600" id="setting-cooldown" data-prj-setting="setting-cooldown" class="input-control mono" value="${setting != null ? setting.cooldownSec : 45}" style="width: 100%; height: 25px; font-size: 10.5px; text-align: center;">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 9.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Spray Duration</span>
                            <strong class="mono" id="label-active-duration" style="color: var(--accent-emerald); font-size: 10.5px;">${setting != null ? setting.maxRunSec : 15}s</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="range" class="spray-range-slider" id="slider-spray-duration" min="1" max="60" step="1" value="${setting != null ? setting.maxRunSec : 15}" oninput="onDurationSliderChange(this.value)" style="flex: 1; height: 4px;">
                            <input type="number" class="input-control mono" id="input-spray-seconds" min="1" max="60" value="${setting != null ? setting.maxRunSec : 15}" oninput="onDurationInputChange(this.value)" style="width: 38px; height: 22px; padding: 1px 2px; font-size: 10px; text-align: center;">
                        </div>

                        <input type="hidden" id="setting-max-run" data-prj-setting="setting-max-run" value="${setting != null ? setting.maxRunSec : 15}">
                        <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-muted);" class="mono">
                            <span id="dash-card-plant-name">Ludisia Discolor</span>
                            <span id="dash-card-thresholds">&lt; 55.0% | Stop &gt; 75.0%</span>
                        </div>

                        <div style="display: flex; gap: 6px; margin-top: 2px;">
                            <button type="button" class="btn btn-emerald btn-sm" id="btn-save-settings" onclick="saveMistingSettings()" style="flex: 1; justify-content: center; height: 26px; font-size: 10.5px; font-weight: 700;">
                                <span>Save Calibration</span>
                            </button>
                            <button type="button" class="btn btn-glass btn-sm" id="btn-save-duration" onclick="saveDurationSetting()" style="height: 26px; font-size: 10.5px; padding: 0 8px;">Save Pulse</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Hidden backward-compatible actuation anchors for existing tests -->
            <div style="display: none;">
                <div id="acc-actuation"></div>
                <div id="acc-botanical"></div>
                <div id="acc-history-table"></div>
                <button id="btn-manual-pump-start" onclick="handleStartPump(true)"></button>
                <button id="btn-manual-pump-stop" onclick="handleStopPump('OPERATOR_STOP')"></button>
                <button id="btn-manual-pump-boost" onclick="quickBoostSpray(15)"></button>
                <span id="label-pump-start">Start</span>
                <span id="manual-relay-status-pill">RELAY</span>
                <span id="manual-ack-feedback"></span>
                <span id="save-duration-feedback"><span id="save-duration-feedback-text">Saved</span></span>
                <div id="telemetry-history-table-body"></div>
                <div id="mini-square-pump" onclick="handlePumpToggleFromSquare()"></div>
                <div id="mini-square-mode" onclick="toggleModeFromSquare()"></div>
                <button id="btn-toggle-controls-dock" onclick="toggleControlsDock()"></button>
            </div>
        </aside>
        <!-- Hidden Sensor KPI Data Anchors (Maintained for Telemetry Model Binding, 100% Hidden) -->
        <div style="display: none !important;" id="hidden-telemetry-anchors">
<div class="holo-vitals-cockpit compact-tier1-kpis" id="holo-vitals-cockpit" style="display: none !important;">
                <div class="holo-vital-pod" id="holo-pod-soil">
                    <div class="holo-vital-ring">
                        <svg viewBox="0 0 36 36" class="vital-ring-svg">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(16, 185, 129, 0.15)" stroke-width="2.8" />
                            <circle id="holo-soil-circle" cx="18" cy="18" r="14" fill="none" stroke="#10b981" stroke-width="2.8" stroke-dasharray="88, 88" stroke-dashoffset="30" stroke-linecap="round" />
                        </svg>
                        <span class="vital-center-val mono" id="holo-soil-val">52%</span>
                    </div>
                    <div class="holo-vital-info">
                        <span class="holo-vital-title">SOIL HYDRATION</span>
                        <span class="holo-vital-status" id="holo-soil-status">Optimal</span>
                    </div>
                </div>

                <div class="holo-vital-pod" id="holo-pod-water">
                    <div class="holo-vital-ring">
                        <svg viewBox="0 0 36 36" class="vital-ring-svg">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(6, 182, 212, 0.15)" stroke-width="2.8" />
                            <circle id="holo-water-circle" cx="18" cy="18" r="14" fill="none" stroke="#06b6d4" stroke-width="2.8" stroke-dasharray="88, 88" stroke-dashoffset="20" stroke-linecap="round" />
                        </svg>
                        <span class="vital-center-val mono" id="holo-water-val">78%</span>
                    </div>
                    <div class="holo-vital-info">
                        <span class="holo-vital-title">WATER TANK</span>
                        <span class="holo-vital-status" id="holo-water-status">Normal</span>
                    </div>
                </div>

                <div class="holo-vital-pod" id="holo-pod-vpd">
                    <div class="holo-vital-ring">
                        <svg viewBox="0 0 36 36" class="vital-ring-svg">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(139, 92, 246, 0.15)" stroke-width="2.8" />
                            <circle id="holo-vpd-circle" cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" stroke-width="2.8" stroke-dasharray="88, 88" stroke-dashoffset="25" stroke-linecap="round" />
                        </svg>
                        <span class="vital-center-val mono" id="holo-vpd-val">0.95</span>
                    </div>
                    <div class="holo-vital-info">
                        <span class="holo-vital-title">VPD PRESSURE</span>
                        <span class="holo-vital-status">Balanced</span>
                    </div>
                </div>

                <div class="holo-vital-pod" id="holo-pod-temp">
                    <div class="holo-vital-ring">
                        <svg viewBox="0 0 36 36" class="vital-ring-svg">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(245, 158, 11, 0.15)" stroke-width="2.8" />
                            <circle id="holo-temp-circle" cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" stroke-width="2.8" stroke-dasharray="88, 88" stroke-dashoffset="18" stroke-linecap="round" />
                        </svg>
                        <span class="vital-center-val mono" id="holo-temp-val">25&deg;C</span>
                    </div>
                    <div class="holo-vital-info">
                        <span class="holo-vital-title">CHAMBER TEMP</span>
                        <span class="holo-vital-status">Stable</span>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Auto-Boot 3D Engine Script -->
<!-- ===================================================================
     VIEW 2: PLANT PROFILES (ZONE BOTANICAL CONFIGURATION)
     ================================================================== -->
<div class="view-pane ${activeNav == 'plants' ? 'active' : ''}" id="view-plants">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px;">
        <div>
            <h2 style="font-family: var(--font-heading); font-size: 19px; font-weight: 700; color: var(--text-main);">Plant Profiles Catalog</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                Define target soil moisture thresholds and burst durations for plant species.
            </p>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
            <input type="text" class="input-control" placeholder="Search plant species or scientific name..." style="width: 220px; height: 38px; font-size: 13px;" id="input-search-plant" onkeyup="filterPlantTable()">
            <button class="btn btn-emerald" onclick="openAddPlantModal()">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Plant Profile
            </button>
        </div>
    </div>

    <!-- Botanical Profile Catalog Table -->
    <div class="glass-card" style="overflow-x: auto;">
        <table class="data-table" id="table-plants">
            <thead>
                <tr>
                    <th>Plant Species</th>
                    <th>Scientific Botanical Name</th>
                    <th>Moisture Thresholds (On - Off)</th>
                    <th>Cycle Duration</th>
                    <th>Horticultural Care Guidelines</th>
                    <th style="text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody id="tbody-plants"></tbody>
        </table>
    </div>
</div>


<!-- ===================================================================
     VIEW 4: MISTING AUTOMATION SETTINGS
     ================================================================== -->
<div class="view-pane ${activeNav == 'settings' ? 'active' : ''}" id="view-settings">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 12px;">
        <div>
            <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--text-main);">Misting Automation Settings</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                Automation rules and hardware safety limits.
            </p>
        </div>
        <button class="btn btn-emerald" onclick="saveSettings()">
            <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save
        </button>
    </div>

    <!-- Overview Status Cards (Summary Bar) -->
    <div class="settings-summary-bar">
        <div class="settings-summary-card">
            <div class="settings-summary-label">Current Mode</div>
            <div class="settings-summary-val" id="sum-mode-val" style="color: var(--accent-emerald);">
                <svg viewBox="0 0 24 24" id="sum-mode-icon" style="width: 17px; height: 17px; stroke: currentColor;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                <span id="sum-mode-text">${setting != null ? setting.desiredMode : 'AUTO'}</span>
            </div>
        </div>
        <div class="settings-summary-card">
            <div class="settings-summary-label">Start Misting At</div>
            <div class="settings-summary-val mono" id="sum-start-val">&lt; ${setting != null ? setting.humidityOn : 40.0}%</div>
        </div>
        <div class="settings-summary-card">
            <div class="settings-summary-label">Stop Misting At</div>
            <div class="settings-summary-val mono" id="sum-stop-val">&gt; ${setting != null ? setting.humidityOff : 65.0}%</div>
        </div>
        <div class="settings-summary-card">
            <div class="settings-summary-label">Max Spray Limit</div>
            <div class="settings-summary-val mono" id="sum-max-val">${setting != null ? setting.maxRunSec : 15}s manual pulse</div>
        </div>
    </div>

    <!-- Main Configuration Container -->
    <div class="glass-card" style="padding: 26px;">
        
        <!-- Section 1: Mode Selection -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--border-hairline);">
            <div class="jewel-icon-box jewel-emerald">
                <svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line></svg>
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main);">1. Select Operational Mode</h3>
        </div>

        <div class="mode-cards-grid">
            <!-- Mode Card 1: AUTO -->
            <div class="mode-card ${setting == null || setting.desiredMode == 'AUTO' ? 'selected' : ''}" id="card-mode-auto" onclick="selectSettingMode('AUTO')">
                <input type="radio" name="setting_mode_radio" ${setting == null || setting.desiredMode == 'AUTO' ? 'checked' : ''} style="position: absolute; top: 18px; right: 18px; accent-color: var(--accent-emerald);">
                <div class="mode-card-title">
                    <div class="jewel-icon-box jewel-emerald" style="width: 26px; height: 26px; border-radius: 7px;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    </div>
                    <span>Automatic (AUTO)</span>
                </div>
                <div class="mode-card-desc">
                    Triggered automatically by soil moisture sensor according to linked plant profile thresholds.
                </div>
            </div>

            <!-- Mode Card 2: MANUAL -->
            <div class="mode-card ${setting != null && setting.desiredMode == 'MANUAL' ? 'selected-manual' : ''}" id="card-mode-manual" onclick="selectSettingMode('MANUAL')">
                <input type="radio" name="setting_mode_radio" ${setting != null && setting.desiredMode == 'MANUAL' ? 'checked' : ''} style="position: absolute; top: 18px; right: 18px; accent-color: var(--accent-amber);">
                <div class="mode-card-title">
                    <div class="jewel-icon-box jewel-amber" style="width: 26px; height: 26px; border-radius: 7px;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 0 1 2 2v7.5a6.5 6.5 0 0 1-13 0V12"></path></svg>
                    </div>
                    <span>Manual (MANUAL)</span>
                </div>
                <div class="mode-card-desc">
                    Sensor automation is off. Operator manually starts/stops the pump directly from the IoT Dashboard.
                </div>
            </div>
        </div>

        <!-- Panel A: AUTO Mode Specific Controls -->
        <div id="panel-settings-auto" style="display: ${setting == null || setting.desiredMode == 'AUTO' ? 'block' : 'none'}; margin-bottom: 24px;">
            <div class="plant-link-banner">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="jewel-icon-box jewel-emerald" style="width: 28px; height: 28px; border-radius: 8px;">
                        <svg viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path d="M12 22v-9"></path><path d="M12 13a5 5 0 0 0-5-5c-2.5 0-4 2-4 2s0 4 4 4c2.5 0 5-1 5-1z"></path></svg>
                    </div>
                    <strong style="color: var(--accent-emerald); font-size: 13.5px;">Link with Plant Profile:</strong>
                </div>
                <button class="btn btn-glass btn-sm" onclick="navigateTo('view-plants')" style="padding: 4px 10px; font-size: 12px;">
                    Open Plant Profiles &rarr;
                </button>
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
                <label class="form-label">Select Target Plant Species / Botanical Preset</label>
                <select id="config-setting-plant-selector" data-prj-setting="setting-plant-selector" class="input-control" onchange="onSettingPlantSelected(this)" style="width: 100%; height: 42px; font-size: 13.5px;">
                    <option value="">-- Choose plant to automatically load recommended moisture thresholds --</option>
                    <optgroup label="Registered Plant Profiles">
                        <c:forEach var="p" items="${allPlants}">
                            <option value="${p.plantId}" data-name="${p.plantName}" data-on="${p.humidityOn != null ? p.humidityOn : 40.0}" data-off="${p.humidityOff != null ? p.humidityOff : 65.0}">
                                [Profile] ${p.plantName} (${p.species}) - Optimal: ${p.humidityOn}% - ${p.humidityOff}%
                            </option>
                        </c:forEach>
                        <c:if test="${empty allPlants}">
                            <option value="1" data-name="Boston Fern" data-on="40.0" data-off="65.0" selected>[Profile] Boston Fern (Nephrolepis exaltata) - Optimal: 40.0% - 65.0%</option>
                            <option value="2" data-name="Moth Orchid" data-on="55.0" data-off="75.0">[Profile] Moth Orchid (Phalaenopsis aphrodite) - Optimal: 55.0% - 75.0%</option>
                            <option value="3" data-name="Cherry Tomato" data-on="50.0" data-off="70.0">[Profile] Cherry Tomato (Solanum lycopersicum) - Optimal: 50.0% - 70.0%</option>
                        </c:if>
                    </optgroup>
                    <optgroup label="Botanical Presets">
                        <option value="preset_orchid" data-name="Orchids" data-on="55.0" data-off="75.0">Orchids (Target 55.0% - 75.0%)</option>
                        <option value="preset_fern" data-name="Ferns" data-on="65.0" data-off="85.0">Ferns - High Humidity (Target 65.0% - 85.0%)</option>
                        <option value="preset_succulent" data-name="Succulents &amp; Cacti" data-on="25.0" data-off="45.0">Succulents &amp; Cacti (Target 25.0% - 45.0%)</option>
                        <option value="preset_indoor" data-name="Tropical Houseplants" data-on="50.0" data-off="70.0">Tropical Houseplants (Target 50.0% - 70.0%)</option>
                    </optgroup>
                </select>
                <div id="setting-plant-applied-note" style="display: block; margin-top: 8px; font-size: 12.5px; color: var(--accent-emerald); font-weight: 600;">
                    <span id="setting-plant-applied-text">✓ Linked with Boston Fern: Turn ON &lt; 40.0%, Turn OFF &gt; 65.0%</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
                <div class="form-group">
                    <label class="form-label" for="setting-hum-on">Pump START Threshold (&lt; %)</label>
                    <input type="number" step="0.5" min="0" max="99" id="config-setting-hum-on" data-prj-setting="setting-hum-on" class="input-control mono" value="${setting != null ? setting.humidityOn : 40.0}" style="width: 100%;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Pump turns ON automatically when soil moisture drops below this value.</div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="setting-hum-off">Pump STOP Threshold (&gt; %)</label>
                    <input type="number" step="0.5" min="1" max="100" id="config-setting-hum-off" data-prj-setting="setting-hum-off" class="input-control mono" value="${setting != null ? setting.humidityOff : 65.0}" style="width: 100%;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Pump turns OFF once soil moisture reaches this target level.</div>
                </div>
            </div>
        </div>

        <!-- Panel B: MANUAL Mode Specific Guidance -->
        <div id="panel-settings-manual" class="manual-info-banner" style="display: ${setting != null && setting.desiredMode == 'MANUAL' ? 'flex' : 'none'}; margin-bottom: 24px;">
            <div class="jewel-icon-box jewel-amber" style="width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>
                <strong style="color: var(--accent-amber);">Manual Irrigation Mode Active:</strong>
                <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 13px;">
                    Air humidity thresholds are <strong>bypassed</strong>. Soil, temperature and water safety locks remain active. The pump will never activate autonomously. 
                    Operators turn the pump ON or OFF manually on the <strong>IoT Dashboard</strong>. Safety duration cutoff below remains active.
                </p>
            </div>
        </div>

        <!-- Section 2: Hardware Safety Timers -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--border-hairline);">
            <div class="jewel-icon-box jewel-amber">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main);">2. Hardware Safety Timers</h3>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px;">
            <div class="form-group">
                <label class="form-label">Max Continuous Spray Limit (Seconds)</label>
                <input type="number" min="1" max="300" id="config-setting-max-run" data-prj-setting="setting-max-run" class="input-control mono" value="${setting != null ? setting.maxRunSec : 15}" style="width: 100%;">
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Mandatory auto-cutoff to prevent pump motor overheating and avoid flooding.</div>
            </div>
            <div class="form-group">
                <label class="form-label">Manual rest preference (Seconds)</label>
                <input type="number" min="0" max="600" id="config-setting-cooldown" data-prj-setting="setting-cooldown" class="input-control mono" value="${setting != null ? setting.cooldownSec : 45}" style="width: 100%;">
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Stored preference for operators. AUTO runs continuously and has no cycle rest.</div>
            </div>
        </div>

        <!-- Bottom Save Action -->
        <div style="display: flex; justify-content: flex-end; padding-top: 18px; border-top: 1px solid var(--border-hairline);">
            <button class="btn btn-emerald" onclick="saveMistingSettings()">
                <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save
            </button>
        </div>

    </div>
</div>



<!-- ===================================================================
     VIEW 3: HISTORY & AUDIT LOGS (SYSTEM OPERATIONS & TELEMETRY RECORDS)
     ================================================================== -->
<div class="view-pane ${activeNav == 'history' ? 'active' : ''}" id="view-history">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div>
            <h2 style="font-family: var(--font-heading); font-size: 19px; font-weight: 700; color: var(--text-main);">System Operations &amp; Audit Logs</h2>
            
        </div>

        <div style="display: flex; gap: 10px;">
            <button class="btn btn-glass btn-sm" onclick="exportHistoryCSV()">
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV
            </button>
            <button class="btn btn-glass btn-sm" onclick="exportHistoryPDF()">
                <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print PDF
            </button>
        </div>
    </div>

    <!-- Time Filtering Header -->
    <div style="display: flex; gap: 12px; align-items: center; padding: 14px; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); margin-bottom: 18px; flex-wrap: wrap;">
        <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Time Range:</span>
            <button class="btn btn-glass btn-sm active" id="btn-flt-today" onclick="filterLogs('today', this)">Today</button>
            <button class="btn btn-glass btn-sm" id="btn-flt-7d" onclick="filterLogs('7d', this)">Last 7 Days</button>
            <button class="btn btn-glass btn-sm" id="btn-flt-all" onclick="filterLogs('all', this)">All Time</button>
            <span style="height: 16px; width: 1px; background: var(--border-hairline); margin: 0 4px;"></span>
            <div style="position: relative; display: inline-flex; align-items: center;">
                <svg viewBox="0 0 24 24" style="position: absolute; left: 8px; width: 13px; height: 13px; stroke: var(--accent-emerald); fill: none; stroke-width: 2; pointer-events: none;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <input type="date" id="input-date-filter" class="input-control mono" style="height: 30px; font-size: 12px; width: 145px; padding: 2px 8px 2px 28px;" onchange="filterLogsByDate(this.value)" title="Filter by specific date (Past and present only)">
            </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
            <input type="text" class="input-control" placeholder="Search event description..." style="height: 36px; font-size: 12.5px; width: 220px;" id="input-search-log" onkeyup="searchLogsTable()">
        </div>
    </div>

    <!-- 3 Dedicated Classification Tabs (Segmented Control Bar) -->
    <div class="history-tab-group">
        <button class="history-tab-btn active" id="tab-btn-pump" onclick="switchHistoryTab('pump')">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Pump Relay Logs</span>
            <span class="history-tab-count" id="cnt-pump-logs">0</span>
        </button>
        <button class="history-tab-btn" id="tab-btn-sensor" onclick="switchHistoryTab('sensor')">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <span>Sensor Telemetry</span>
            <span class="history-tab-count" id="cnt-sensor-logs">0</span>
        </button>
        <button class="history-tab-btn" id="tab-btn-audit" onclick="switchHistoryTab('audit')">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Security Audit Logs</span>
            <span class="history-tab-count" id="cnt-audit-logs">0</span>
        </button>
    </div>

    <!-- Table Container -->
    <div class="glass-card" style="overflow-x: auto;">
        <!-- Tab 1: Pump Controls -->
        <table class="data-table" id="table-tab-pump">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Mode</th>
                    <th>Command</th>
                    <th>Operator</th>
                    <th>Duration</th>
                    <th>Reservoir</th>
                    <th>Execution Status</th>
                </tr>
            </thead>
            <tbody class="mono" id="tbody-pump-logs"></tbody>
        </table>

        <!-- Tab 2: Sensor Telemetry -->
        <table class="data-table" id="table-tab-sensor" style="display: none;">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Soil Moisture (%)</th>
                    <th>Reservoir Level (%)</th>
                    <th>Air Humidity RH (%)</th>
                    <th>Operational Status</th>
                </tr>
            </thead>
            <tbody class="mono" id="tbody-sensor-logs"></tbody>
        </table>

        <!-- Tab 3: Security Audit Logs -->
        <table class="data-table" id="table-tab-audit" style="display: none;">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Security Action</th>
                    <th>Event Details</th>
                    <th>User Account</th>
                    <th>IP Address</th>
                    <th>Severity</th>
                </tr>
            </thead>
            <tbody class="mono" id="tbody-audit-logs"></tbody>
        </table>
    </div>
</div>





<!-- ===================================================================
     VIEW 6: USER MANAGEMENT (FULL RBAC CRUD)
     ================================================================== -->
<div class="view-pane ${activeNav == 'users' ? 'active' : ''}" id="view-users">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px;">
        <div>
            <h2 style="font-family: var(--font-heading); font-size: 19px; font-weight: 700; color: var(--text-main);">User Account Management</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                System accounts and role-based access control directory.
            </p>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
            <input type="text" class="input-control" placeholder="Search username or email..." style="width: 220px; height: 38px; font-size: 13px;" id="input-search-user" onkeyup="filterUserTable()">
            <button class="btn btn-emerald" onclick="openCreateUserModal()">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add User
            </button>
        </div>
    </div>

    <!-- User Accounts Table -->
    <div class="glass-card" style="overflow-x: auto;">
        <table class="data-table" id="table-users">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role (RBAC)</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th style="text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody id="tbody-users"></tbody>
        </table>
    </div>
</div>


<!-- ===================================================================
     VIEW 7: USER PROFILE (BALANCED 2-COLUMN SCADA/APPLE UI)
     ================================================================== -->
<div class="view-pane ${activeNav == 'profile' ? 'active' : ''}" id="view-profile">
    
    <c:if test="${not empty successMessage}">
        <div class="alert alert-emerald" style="margin-bottom: 18px; padding: 12px 18px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 10px;">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2.2;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>${successMessage}</span>
        </div>
    </c:if>
    <c:if test="${not empty errorMessage}">
        <div class="alert alert-crimson" style="margin-bottom: 18px; padding: 12px 18px; border-radius: var(--radius-md); background: rgba(169, 27, 13, 0.15); border: 1px solid rgba(169, 27, 13, 0.35); color: #A91B0D; font-weight: 600; display: flex; align-items: center; gap: 10px;">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2.2;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>${errorMessage}</span>
        </div>
    </c:if>

    <!-- 2-Column Balanced Profile Grid -->
    <div class="profile-executive-grid">
        
        <!-- Left Column: User Identity Card (Clean, Minimal, No Duplication) -->
        <div class="glass-card profile-id-card">
            <div class="profile-avatar-wrap">
                <div class="apple-avatar" id="profile-card-avatar">
                    ${sessionScope.user != null ? fn:escapeXml(sessionScope.user.username).substring(0, 1).toUpperCase() : 'A'}
                </div>
                <h2 class="apple-profile-name" id="profile-card-fullname">
                    ${sessionScope.user != null ? fn:escapeXml(sessionScope.user.fullName) : 'Administrator'}
                </h2>
                <div class="apple-profile-meta">
                    <span>@<strong id="profile-card-username">${sessionScope.user != null ? fn:escapeXml(sessionScope.user.username) : 'admin'}</strong></span>
                </div>
                <div style="margin-top: 10px;">
                    <span class="badge-pill badge-violet" id="profile-card-role" style="font-size: 11px; padding: 3px 12px; letter-spacing: 0.05em;">
                        ${sessionScope.user != null ? sessionScope.user.roleCode : 'ADMIN'}
                    </span>
                </div>
            </div>

            <!-- Identity Attribute Rows -->
            <div class="profile-details-list">
                <div class="profile-detail-row">
                    <span class="profile-detail-label" style="display: flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Account Status
                    </span>
                    <span class="badge-pill ${sessionScope.user != null && sessionScope.user.isLocked ? 'badge-crimson' : 'badge-emerald'}" style="font-size: 11px; padding: 2px 10px;">
                        ${sessionScope.user != null && not empty fn:escapeXml(sessionScope.user.statusText) ? fn:escapeXml(sessionScope.user.statusText) : (sessionScope.user != null && sessionScope.user.isLocked ? 'Locked' : 'Active')}
                    </span>
                </div>
                <div class="profile-detail-row">
                    <span class="profile-detail-label" style="display: flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
                        User ID
                    </span>
                    <span class="mono" style="color: var(--text-main); font-weight: 600;">#${sessionScope.user != null ? sessionScope.user.userId : 1}</span>
                </div>
                <div class="profile-detail-row">
                    <span class="profile-detail-label" style="display: flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        Email Address
                    </span>
                    <span id="profile-card-email-val" style="color: var(--text-main); font-weight: 500;">${sessionScope.user != null ? fn:escapeXml(sessionScope.user.email) : 'admin@example.com'}</span>
                </div>
            </div>

            <!-- Single Edit Action Button (Navigates to User Management) -->
            <div style="margin-top: 24px;">
                <button type="button" class="btn btn-emerald" onclick="navigateTo('view-users')" style="width: 100%; justify-content: center; height: 38px; font-size: 12.5px; font-weight: 700;">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; margin-right: 6px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Manage Users &amp; Permissions
                </button>
            </div>
            
            <!-- Hidden input bridges for backward JS compatibility -->
            <input type="hidden" id="profile-card-fullname-val" value="${sessionScope.user != null ? fn:escapeXml(sessionScope.user.fullName) : 'Admin'}">
            <input type="hidden" id="profile-card-fullname-input" value="${sessionScope.user != null ? fn:escapeXml(sessionScope.user.fullName) : 'Admin'}">
            <input type="hidden" id="profile-card-email-input" value="${sessionScope.user != null ? fn:escapeXml(sessionScope.user.email) : 'admin@example.com'}">
            <span id="profile-card-email-display" style="display:none">${sessionScope.user != null ? fn:escapeXml(sessionScope.user.email) : 'admin@example.com'}</span>
        </div>

        <!-- Right Column: Current Role Authoritative Privileges (Filtered strictly to active user's role) -->
        <div class="glass-card" style="padding: 24px 28px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border-hairline);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="jewel-icon-box jewel-emerald" style="width: 36px; height: 36px;">
                            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2;">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0;">Account Role Privileges</h3>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Authoritative capabilities granted to your account.</div>
                        </div>
                    </div>
                    <span class="badge-pill badge-violet" style="font-size: 11px; padding: 4px 12px; font-weight: 700;">
                        ROLE: ${sessionScope.user != null ? sessionScope.user.roleCode : 'ADMIN'}
                    </span>
                </div>

                <div class="role-privilege-list" style="display: flex; flex-direction: column; gap: 10px;">
                    <c:choose>
                        <c:when test="${sessionScope.user != null && sessionScope.user.roleCode == 'ADMIN'}">
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Full SCADA Telemetry &amp; Spline Analytics</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Live sensor telemetry, spline charts &amp; CSV data export.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Manual Actuation &amp; Pump Override</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Direct pump control (Relay D8) &amp; emergency stop.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Misting Automation &amp; Calibration</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Configure air humidity thresholds and manual pulse duration.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Plant Profiles Catalog Management</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Create &amp; manage botanical profiles and target envelopes.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">System Administration &amp; Governance</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">User account management, RBAC roles &amp; audit logs.</div>
                                </div>
                            </div>
                        </c:when>
                        <c:when test="${sessionScope.user != null && sessionScope.user.roleCode == 'STAFF'}">
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Full SCADA Telemetry &amp; Spline Analytics</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Live sensor telemetry, spline charts &amp; CSV data export.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Manual Actuation &amp; Pump Override</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Direct pump control (Relay D8) &amp; 15s boost spray.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Misting Automation Settings</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Adjust moisture thresholds &amp; species configurations.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Botanical Plant Profiles Access</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Create &amp; update botanical profiles for crop zones.</div>
                                </div>
                            </div>
                        </c:when>
                        <c:otherwise>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Real-Time Sensor Observation</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Read-only live sensor streaming and reservoir monitoring.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Historical Operations &amp; Audit Logs</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Inspect past telemetry trends and actuation records.</div>
                                </div>
                            </div>
                            <div class="role-privilege-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm);">
                                <div style="color: var(--accent-emerald);">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Botanical Plant Catalog View</div>
                                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">View botanical profiles and moisture envelopes.</div>
                                </div>
                            </div>
                        </c:otherwise>
                    </c:choose>
                </div>
            </div>
        </div>

    </div>

</div>

<!-- Bridge Real Server Entities to AppState -->


<!-- =========================================================================
     WEATHER LOCATION & PROVINCE SEARCH MODAL (OPEN-METEO)
     ========================================================================= -->
<div id="modal-weather-location" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); z-index: 1000; align-items: center; justify-content: center;">
    <div class="frosted-glass" style="width: min(520px, 92vw); border-radius: 20px; padding: 24px; background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(255, 255, 255, 0.7); box-shadow: 0 24px 60px rgba(0,0,0,0.25); color: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #10b981; fill: none; stroke-width: 2.2;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Select Weather Region</h3>
            </div>
            <button type="button" class="btn btn-glass btn-sm" onclick="closeWeatherLocationModal()" style="padding: 4px 10px; font-size: 16px; border-radius: 8px; cursor: pointer;">&times;</button>
        </div>

        <p style="font-size: 12.5px; color: #64748b; margin-top: 0; margin-bottom: 14px; line-height: 1.5;">
            Select your agricultural zone to synchronize real-time climate, rain probability, and temperature via Open-Meteo.
        </p>

        <!-- Search Input -->
        <div style="position: relative; margin-bottom: 14px;">
            <input type="text" id="weather-location-search-input" placeholder="Search city or province (e.g. Ho Chi Minh City, Da Lat, Ha Noi, Can Tho...)" style="width: 100%; padding: 10px 14px 10px 36px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.15); background: #ffffff; font-size: 13px; color: #0f172a; box-sizing: border-box;" oninput="filterWeatherProvinces(this.value)">
            <svg viewBox="0 0 24 24" style="position: absolute; left: 12px; top: 12px; width: 14px; height: 14px; stroke: #94a3b8; fill: none; stroke-width: 2.2;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <!-- Province Chips -->
        <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 8px;">Popular Growing Regions:</div>
        <div id="weather-province-chips-container" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 210px; overflow-y: auto; padding: 2px;">
            <!-- Rendered by JS -->
        </div>

        <div style="margin-top: 18px; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-emerald btn-sm" onclick="closeWeatherLocationModal()" style="padding: 8px 18px; border-radius: 10px; font-size: 12.5px; font-weight: 600;">Done</button>
        </div>
    </div>
</div>

<script>
// =========================================================================
// REAL-TIME WEATHER ENGINE & SEARCHABLE PROVINCE LOCATIONS (OPEN-METEO)
// =========================================================================
(function() {
    const VIETNAM_PROVINCES = [
        { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 },
        { name: 'Vinh Long', lat: 10.2537, lon: 105.9722 },
        { name: 'Ha Noi', lat: 21.0285, lon: 105.8542 },
        { name: 'Da Nang', lat: 16.0544, lon: 108.2022 },
        { name: 'Can Tho', lat: 10.0452, lon: 105.7469 },
        { name: 'Da Lat', lat: 11.9404, lon: 108.4583 },
        { name: 'Binh Duong', lat: 11.1333, lon: 106.6667 },
        { name: 'Bien Hoa', lat: 10.9574, lon: 106.8427 },
        { name: 'Nha Trang', lat: 12.2388, lon: 109.1967 },
        { name: 'Hai Phong', lat: 20.8449, lon: 106.6881 },
        { name: 'Long Xuyen', lat: 10.3759, lon: 105.4185 },
        { name: 'My Tho', lat: 10.3600, lon: 106.3600 },
        { name: 'Ben Tre', lat: 10.2415, lon: 106.3759 },
        { name: 'Cao Lanh', lat: 10.4602, lon: 105.6329 },
        { name: 'Rach Gia', lat: 10.0125, lon: 105.0809 },
        { name: 'Buon Ma Thuot', lat: 12.6667, lon: 108.0500 },
        { name: 'Hue', lat: 16.4637, lon: 107.5909 },
        { name: 'Ha Long', lat: 20.9505, lon: 107.0734 },
        { name: 'Vung Tau', lat: 10.3460, lon: 107.0843 },
        { name: 'Phan Thiet', lat: 10.9333, lon: 108.1000 }
    ];

    let currentCity = { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 };
    try {
        const saved = localStorage.getItem('prj_iot_weather_city');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.name && parsed.lat) currentCity = parsed;
        }
    } catch (_) {}

    function tickClock() {
        const tEl = document.getElementById('hud-live-time');
        const dEl = document.getElementById('hud-live-date');
        if (!tEl) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        tEl.textContent = h + ':' + m + ':' + s;
        if (dEl) {
            dEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
    }
    setInterval(tickClock, 1000);
    tickClock();

    function updateLocationBadge() {
        const locName = document.getElementById('hud-location-name');
        if (locName) locName.textContent = currentCity.name;
    }

    function fetchWeatherForCity(city) {
        if (city && city.name) {
            city.name = city.name.replace(/\s*\(.*?\)\s*/g, '').trim() || city.name;
        }
        currentCity = city;
        updateLocationBadge();
        try { localStorage.setItem('prj_iot_weather_city', JSON.stringify(city)); } catch (_) {}

        const tempEl = document.getElementById('hud-weather-temp');
        const condEl = document.getElementById('hud-weather-condition');
        const humEl = document.getElementById('hud-weather-humidity');
        const rainEl = document.getElementById('hud-weather-rain-prob');
        const uvEl = document.getElementById('hud-weather-sun-rating');
        const iconWrap = document.getElementById('hud-weather-icon-wrap');
        const rangeEl = document.getElementById('hud-weather-range');

        const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
            '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,uv_index,is_day' +
            '&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,uv_index' +
            '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FHo_Chi_Minh&forecast_days=1';

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data || !data.current) return;
                const curT = Math.round(data.current.temperature_2m);
                const code = data.current.weather_code || 0;
                const hum = data.current.relative_humidity_2m || 68;
                const precip = data.current.precipitation || 0;
                const uv = Math.round(data.current.uv_index || 5);

                let condText = 'Sunny';
                let iconColor = '#f59e0b';
                let iconSvg = '<circle cx="12" cy="12" r="4.5"></circle><line x1="12" y1="2" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"></line><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"></line><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"></line>';

                if (code >= 1 && code <= 3) {
                    condText = 'Partly Cloudy';
                    iconColor = '#38bdf8';
                    iconSvg = '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>';
                } else if ((code >= 51 && code <= 67) || code >= 80) {
                    condText = 'Rain Showers';
                    iconColor = '#0ea5e9';
                    iconSvg = '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M16 14v6"></path><path d="M8 14v6"></path><path d="M12 16v6"></path>';
                } else if (code >= 45 && code <= 48) {
                    condText = 'Mist & Fog';
                    iconColor = '#a855f7';
                    iconSvg = '<path d="M5 10h14M3 14h18M7 18h10"></path>';
                }

                if (tempEl) tempEl.textContent = curT + '°C';
                if (condEl) condEl.textContent = condText;
                if (humEl) humEl.textContent = hum + '%';
                if (rainEl) rainEl.textContent = (precip > 0 ? (precip * 15).toFixed(0) : '0') + '%';
                if (uvEl) {
                    let uvLabel = 'UV ' + uv;
                    uvEl.textContent = uvLabel;
                    uvEl.style.color = uv >= 8 ? '#ef4444' : (uv >= 4 ? '#f59e0b' : '#10b981');
                }
                if (iconWrap) {
                    iconWrap.innerHTML = '<svg viewBox="0 0 24 24" class="apple-weather-svg" style="stroke: ' + iconColor + '; fill: none; stroke-width: 2;">' + iconSvg + '</svg>';
                }

                // Update Hourly Milestones: 08:00, 12:00, 16:00, 20:00
                if (data.hourly && data.hourly.temperature_2m) {
                    const times = [8, 12, 16, 20];
                    times.forEach(hr => {
                        const idx = hr;
                        const t = Math.round(data.hourly.temperature_2m[idx] || (25 + (hr === 12 ? 8 : (hr === 16 ? 5 : 2))));
                        const u = Math.round((data.hourly.uv_index && data.hourly.uv_index[idx]) || (hr === 12 ? 9 : (hr === 8 ? 3 : 1)));
                        const p = (data.hourly.precipitation_probability && data.hourly.precipitation_probability[idx]) || 0;

                        const hrStr = String(hr).padStart(2, '0');
                        const tEl = document.getElementById('ms-temp-' + hrStr);
                        const uvEl = document.getElementById('ms-uv-' + hrStr);
                        if (tEl) tEl.textContent = t + '°C';
                        if (uvEl) {
                            if (p > 50) {
                                uvEl.textContent = p + '%';
                                uvEl.style.background = 'rgba(56,189,248,0.15)';
                                uvEl.style.color = '#0284c7';
                            } else if (u >= 8) {
                                uvEl.textContent = 'Sun';
                                uvEl.style.background = 'rgba(239,68,68,0.15)';
                                uvEl.style.color = '#dc2626';
                            } else if (u >= 4) {
                                uvEl.textContent = 'Mild';
                                uvEl.style.background = 'rgba(245,158,11,0.15)';
                                uvEl.style.color = '#d97706';
                            } else {
                                uvEl.textContent = 'Cool';
                                uvEl.style.background = 'rgba(16,185,129,0.15)';
                                uvEl.style.color = '#059669';
                            }
                        }
                    });
                }
            })
            .catch(err => {
                console.warn('Weather fetch fallback engaged:', err);
                const isHighland = (city.lat > 11.5 && city.lat < 12.5 && city.lon > 108.0 && city.lon < 109.0);
                const isNorth = (city.lat > 19.0);
                const fallbackTemp = isHighland ? '20°C' : (isNorth ? '22°C' : '29°C');
                if (tempEl) tempEl.textContent = fallbackTemp;
                if (condEl) condEl.textContent = isHighland ? 'Rain Showers' : 'Partly Cloudy';
                if (humEl) humEl.textContent = isHighland ? '85%' : '68%';
                if (rainEl) rainEl.textContent = isHighland ? '40%' : '10%';
            });
    }

    window.toggleDailyForecast = function() {
        const dropdown = document.getElementById('hud-forecast-dropdown');
        const chevron = document.getElementById('forecast-chevron');
        if (!dropdown) return;
        const isHidden = dropdown.style.display === 'none';
        if (isHidden) {
            dropdown.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            dropdown.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    };

    document.addEventListener('click', function(e) {
        const clock = document.getElementById('hud-weather-clock');
        const dropdown = document.getElementById('hud-forecast-dropdown');
        const chevron = document.getElementById('forecast-chevron');
        if (clock && dropdown && dropdown.style.display !== 'none') {
            if (!clock.contains(e.target)) {
                dropdown.style.display = 'none';
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            }
        }
    });

    window.openWeatherLocationModal = function() {
        const modal = document.getElementById('modal-weather-location');
        if (!modal) return;
        modal.style.display = 'flex';
        renderWeatherProvinces(VIETNAM_PROVINCES);
        const input = document.getElementById('weather-location-search-input');
        if (input) { input.value = ''; input.focus(); }
    };

    window.closeWeatherLocationModal = function() {
        const modal = document.getElementById('modal-weather-location');
        if (modal) modal.style.display = 'none';
    };

    function renderWeatherProvinces(list) {
        const container = document.getElementById('weather-province-chips-container');
        if (!container) return;
        container.innerHTML = '';
        list.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-glass btn-sm';
            btn.style.cssText = 'padding: 6px 12px; font-size: 12px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(0,0,0,0.1);';
            if (p.name === currentCity.name) {
                btn.style.borderColor = '#10b981';
                btn.style.background = 'rgba(16,185,129,0.12)';
                btn.style.color = '#10b981';
                btn.style.fontWeight = '700';
            }
            btn.innerHTML = '<span>' + p.name + '</span>';
            btn.onclick = function() {
                fetchWeatherForCity(p);
                closeWeatherLocationModal();
            };
            container.appendChild(btn);
        });
    }

    window.filterWeatherProvinces = function(query) {
        if (!query || !query.trim()) {
            renderWeatherProvinces(VIETNAM_PROVINCES);
            return;
        }
        const q = query.toLowerCase().trim();
        const filtered = VIETNAM_PROVINCES.filter(p => p.name.toLowerCase().includes(q));
        renderWeatherProvinces(filtered);
    };

    // Initial weather fetch on startup
    setTimeout(() => fetchWeatherForCity(currentCity), 300);
    setInterval(() => fetchWeatherForCity(currentCity), 20 * 60 * 1000);
})();

// =========================================================================
// DRAWER & 3D VIEWPORT SPLIT HANDLERS (F11 / R3)
// =========================================================================
window.openTelemetryDrawer = function() {
    const drawer = document.getElementById('telemetry-drawer');
    const viewport = document.getElementById('digital-twin-viewport');
    if (drawer) {
        drawer.classList.add('open');
        drawer.style.transform = 'translateX(0)';
    }
    if (viewport) {
        viewport.classList.add('telemetry-drawer-open');
    }
    document.body.classList.add('has-telemetry-open');
    if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
        setTimeout(function() { window.Garden3D.resize(); }, 60);
        setTimeout(function() { window.Garden3D.resize(); }, 250);
        setTimeout(function() { window.Garden3D.resize(); }, 450);
    }
    if (typeof window.renderTelemetryChart === 'function') {
        window.renderTelemetryChart();
    }
};

window.closeTelemetryDrawer = function() {
    const drawer = document.getElementById('telemetry-drawer');
    const viewport = document.getElementById('digital-twin-viewport');
    if (drawer) {
        drawer.classList.remove('open');
        drawer.style.transform = 'translateX(100%)';
    }
    if (viewport) {
        viewport.classList.remove('telemetry-drawer-open');
    }
    document.body.classList.remove('has-telemetry-open');
    if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
        setTimeout(function() { window.Garden3D.resize(); }, 60);
        setTimeout(function() { window.Garden3D.resize(); }, 250);
        setTimeout(function() { window.Garden3D.resize(); }, 450);
    }
};
</script>

<!-- =========================================================================
     BRIDGE REAL SERVER ENTITIES TO APPSTATE & FOOTER
     ========================================================================= -->
<script>window.INITIAL_SERVER_DATA = ${empty bootstrapJson ? "{}" : bootstrapJson};</script>

<jsp:include page="/WEB-INF/views/layout/footer.jsp" />
