<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<%
    String active = request.getParameter("activeNav");
    if (active == null || active.trim().isEmpty()) {
        Object attr = request.getAttribute("activeNav");
        if (attr != null) active = attr.toString();
    }
    if (active == null || active.trim().isEmpty()) {
        String uri = request.getRequestURI();
        if (uri.contains("plant")) active = "plants";
        else if (uri.contains("history")) active = "history";
        else if (uri.contains("user")) active = "users";
        else if (uri.contains("device")) active = "devices";
        else if (uri.contains("setting")) active = "settings";
        else if (uri.contains("profile")) active = "profile";
        else active = "dashboard";
    }
    pageContext.setAttribute("curNav", active.trim());
%>

<aside id="sidebar">
    <!-- Brand Pod -->
    <div class="brand-pod">
        <div class="brand-icon-box" title="Smart Misting IoT">
            <!-- Unified Botanical Emerald Leaf Logo (No glow, crisp emerald leaf) -->
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; stroke: #10B981; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;">
                <path d="M9 18c6.2 0 12-4.8 12-15-10.2 0-15 5.8-15 12a6.5 6.5 0 0 0 3 3z" style="fill: rgba(16, 185, 129, 0.22); stroke: #10B981;"></path>
                <path d="M5 21c.5-4.5 2.5-8 7-10" style="stroke: #10B981;"></path>
                <path d="M9 15c2.5-1 4.5-2.5 6-5" style="stroke: #10B981; stroke-width: 1.5; opacity: 0.8;"></path>
            </svg>
        </div>
        <div>
            <div class="brand-title">Smart Misting</div>
            <div class="brand-tag">PRJ301 | SE2022 | GROUP 5</div>
        </div>
    </div>

    <!-- Navigation Tree -->
    <div class="nav-scroll">
        <!-- Operations & Telemetry -->
        <div>
            <div class="nav-sec-title">OPERATIONS &amp; TELEMETRY</div>
            <ul class="nav-list">
                <li class="nav-item ${curNav == 'dashboard' ? 'active' : ''}" data-target="view-dashboard" onclick="navigateTo('view-dashboard')" title="IoT Dashboard">
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <span class="nav-text">IoT Dashboard</span>
                </li>
                <li class="nav-item ${curNav == 'plants' ? 'active' : ''}" data-target="view-plants" onclick="navigateTo('view-plants')" title="Plant Profiles">
                    <svg viewBox="0 0 24 24"><path d="M12 22v-9"></path><path d="M12 13a5 5 0 0 0-5-5c-2.5 0-4 2-4 2s0 4 4 4c2.5 0 5-1 5-1z"></path><path d="M12 13a5 5 0 0 1 5-5c2.5 0 4 2 4 2s0 4-4 4c-2.5 0-5-1-5-1z"></path></svg>
                    <span class="nav-text">Plant Profiles</span>
                </li>
                <li class="nav-item ${curNav == 'settings' ? 'active' : ''}" data-target="view-settings" onclick="navigateTo('view-settings')" title="Misting Settings" style="display: none !important;" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span class="nav-text">Misting Settings</span>
                </li>
                <li class="nav-item ${curNav == 'history' ? 'active' : ''}" data-target="view-history" onclick="navigateTo('view-history')" title="History &amp; Audit Logs">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span class="nav-text">History &amp; Audit Logs</span>
                </li>
            </ul>
        </div>

        <!-- Security & Access -->
        <div>
            <div class="nav-sec-title">SECURITY &amp; ACCESS</div>
            <ul class="nav-list">
                <c:if test="${empty sessionScope.user || sessionScope.user.roleCode == 'ADMIN'}">
                <li class="nav-item ${curNav == 'users' ? 'active' : ''}" data-target="view-users" onclick="navigateTo('view-users')" title="User Management">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span class="nav-text">User Management</span>
                </li>
                </c:if>
                <li class="nav-item ${curNav == 'profile' ? 'active' : ''}" data-target="view-profile" onclick="navigateTo('view-profile')" title="Profile">
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span class="nav-text">Profile</span>
                </li>
            </ul>
        </div>
    </div>

    <!-- Dedicated Hardware Control Station (Clean Bordered Container Distinct from Logout) -->
    <div class="sidebar-hardware-pod" id="sidebar-hardware-pod">
        <div class="sidebar-hw-card">
            <div class="sidebar-hw-top">
                <div class="sidebar-hw-device-info">
                    <span class="beacon-dot offline" id="sidebar-hw-beacon"></span>
                    <span class="sidebar-hw-title" id="sidebar-hw-device" title="Arduino Uno">Arduino Uno</span>
                </div>
                <span class="badge-pill badge-crimson" id="sidebar-hw-status" style="font-size: 9.5px; padding: 1px 7px;">Offline</span>
            </div>
            <!-- Stacked Clean Connect / Disconnect Action with Hardware Cable/USB Icon -->
            <button id="sidebar-connect-btn" class="sidebar-connect-pill disconnected" onclick="if(typeof handleSidebarConnectClick==='function'){handleSidebarConnectClick();}else if(typeof openConnectModal==='function'){openConnectModal();}else{openModal('modal-connect-hardware');}" title="Hardware Connection">
                <svg viewBox="0 0 24 24" id="sidebar-hw-btn-icon" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2;">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span id="sidebar-connect-text">CONNECT</span>
            </button>
        </div>
    </div>

    <!-- Identity Pod with Unified Avatar & Sign Out -->
    <div class="identity-pod">
        <div class="identity-unified-box" onclick="openModal('modal-signout')" title="Sign Out / Account (${sessionScope.user != null ? sessionScope.user.fullName : 'Admin'})">
            <div class="identity-avatar" id="sidebar-avatar-initial">
                ${sessionScope.user != null ? sessionScope.user.username.substring(0, 1).toUpperCase() : 'A'}
                <span class="collapsed-logout-badge" title="Sign Out">
                    <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                </span>
            </div>
            <div class="identity-meta">
                <div class="identity-name" id="sidebar-identity-name" title="${sessionScope.user != null ? sessionScope.user.fullName : 'Admin'}">
                    ${sessionScope.user != null ? sessionScope.user.fullName : 'NGUYEN NHAT TAM'}
                </div>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                    <span class="badge-pill badge-violet" id="sidebar-identity-role" style="font-size: 9.5px; padding: 1px 6px;">
                        ${sessionScope.user != null ? sessionScope.user.roleCode : 'ADMIN'}
                    </span>
                </div>
            </div>
            <button type="button" class="btn-signout" onclick="event.stopPropagation(); openModal('modal-signout');" title="Sign Out">
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.2;">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
            </button>
        </div>
    </div>
</aside>
