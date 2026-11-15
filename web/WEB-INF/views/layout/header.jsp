<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${param.pageTitle != null ? param.pageTitle : "Smart Misting IoT"} | Group 5 PRJ301</title>
    
    <!-- Typography: Inter, Plus Jakarta Sans, JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
    
    <!-- Local FontAwesome (Instant) -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/fontawesome.min.css">
    <!-- Master Luxury Obsidian Stylesheet with Cache Busting -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/garden3d.css?v=36_v34">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css?v=42">
    
    <script>
        window.contextPath = "${pageContext.request.contextPath}";
    </script>
</head>
<body>
<div id="app-container">
    <!-- Mobile Sidebar Dimmed Backdrop -->
    <div id="sidebar-backdrop" onclick="toggleSidebar()"></div>

    <!-- Collapsible Sidebar Component -->
    <jsp:include page="/WEB-INF/views/layout/sidebar.jsp">
        <jsp:param name="activeNav" value="${param.activeNav}" />
    </jsp:include>

    <!-- Main Workspace -->
    <main id="workspace">
        <!-- Topbar Header -->
        <header id="topbar">
            <div style="display: flex; align-items: center; gap: 14px;">
                <!-- Sidebar Collapse Toggle Button -->
                <button class="btn btn-glass btn-sm" id="btn-toggle-sidebar" onclick="toggleSidebar()" title="Toggle Sidebar" style="padding: 7px 10px;">
                    <svg viewBox="0 0 24 24" id="sidebar-toggle-icon" style="width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2;">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <div class="topbar-breadcrumb">
                    <span style="color: var(--text-muted);" class="breadcrumb-prefix">Smart Misting</span>
                    <span style="color: var(--border-hairline);" class="breadcrumb-separator">/</span>
                    <span id="breadcrumb-title" style="color: var(--brand-tag-color, var(--accent-emerald)); font-weight: 600;">
                        ${param.pageTitle != null ? param.pageTitle : "IoT Dashboard"}
                    </span>
                </div>
            </div>

            <!-- Target Plant Profile Pill in Center of Topbar -->
            <div class="topbar-plant-pill" id="topbar-plant-pill">
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0;">
                    <path d="M12 22v-9"></path>
                    <path d="M12 13a5 5 0 0 0-5-5c-2.5 0-4 2-4 2s0 4 4 4c2.5 0 5-1 5-1z"></path>
                    <path d="M12 13a5 5 0 0 1 5-5c2.5 0 4 2 4 2s0 4-4 4c-2.5 0-5-1-5-1z"></path>
                </svg>
                <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">Plant:</span>
                <strong id="topbar-active-plant-text" style="color: currentColor; font-size: 12.5px; font-weight: 700;">Boston Fern (40% - 65%)</strong>
            </div>

            <div class="topbar-controls" style="display: flex; align-items: center; gap: 10px;">
                <!-- Protruding Left-Slide Toast Banner (Pops out horizontally from the bell, pushing plant pill to the left) -->
                <div id="notif-flyout-banner" class="notif-flyout-banner">
                    <span class="notif-flyout-icon" id="notif-flyout-icon">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                    </span>
                    <span class="notif-flyout-text" id="notif-flyout-text"></span>
                    <button type="button" class="notif-flyout-close" onclick="closeNotifFlyout(event)">&times;</button>
                </div>

                <!-- Notification Bell & Recent Dropdown Anchor -->
                <div class="topbar-notif-anchor" id="topbar-notif-anchor" style="position: relative; display: inline-flex; align-items: center;">

                    <!-- Perfectly Centered Notification Bell Button -->
                    <button class="btn btn-glass btn-sm topbar-icon-btn" id="btn-notif-bell" onclick="toggleNotificationDropdown(event)" title="System Notifications (Latest 5)" style="position: relative !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important; padding: 0 !important; box-sizing: border-box !important;">
                        <svg viewBox="0 0 24 24" id="notif-bell-icon" style="width: 16px !important; height: 16px !important; stroke: currentColor !important; fill: none !important; stroke-width: 2.2 !important; margin: 0 !important; display: block !important; flex-shrink: 0 !important;">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span class="bell-status-dot" id="bell-status-dot"></span>
                    </button>

                    <!-- 5 Recent Notifications Dropdown (Protruding to the LEFT) -->
                    <div id="notif-dropdown-popover" class="notif-dropdown-popover" style="display: none;">
                        <div class="notif-popover-header">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: #10B981; fill: none; stroke-width: 2.2;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                <span style="font-size: 12.5px; font-weight: 700; color: var(--text-main);">Notifications (Recent 5)</span>
                            </div>
                            <button type="button" class="notif-popover-clear" onclick="clearSystemNotifications(event)" title="Clear history">Clear</button>
                        </div>
                        <div id="notif-popover-list" class="notif-popover-list">
                            <!-- Populated dynamically via JS -->
                        </div>
                    </div>
                </div>

                <!-- Theme Toggle Button (Icon-Only) -->
                <button class="btn btn-glass btn-sm topbar-icon-btn" id="btn-theme-toggle" onclick="toggleTheme()" title="Switch Light/Dark Theme">
                    <svg viewBox="0 0 24 24" id="theme-icon" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>

                <!-- Fullscreen Toggle Button (Icon-Only) -->
                <button class="btn btn-glass btn-sm topbar-icon-btn" id="btn-fullscreen-toggle" onclick="toggleFullscreen()" title="Toggle Fullscreen">
                    <svg viewBox="0 0 24 24" id="fullscreen-icon" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                </button>

                <!-- User Greeting -->
                <span class="topbar-user-greeting" style="font-size: 13px; color: var(--text-secondary); font-weight: 500; margin-left: 4px;">
                    Hello, <strong style="color: var(--text-main);" id="user-greeting-name">${sessionScope.user != null ? fn:escapeXml(sessionScope.user.fullName) : 'Administrator'}</strong>
                </span>
            </div>
        </header>

        <!-- Central Viewport -->
        <div id="view-viewport" style="flex: 1; overflow-y: auto; padding: 24px;">
