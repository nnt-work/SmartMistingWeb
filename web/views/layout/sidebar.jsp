<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<aside class="sidebar">
    <!-- Brand Header -->
    <div class="sidebar-header">
        <div class="logo-badge">
            <svg viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
        </div>
        <div class="logo-text">
            <h2>Smart Misting</h2>
            <span>PRJ301 • Group 5</span>
        </div>
    </div>

    <!-- Navigation Menu -->
    <div class="nav-section">
        <div class="nav-section-title">Vận hành & Giám sát</div>
        <ul class="nav-menu">
            <li class="nav-item ${param.activeNav == 'dashboard' ? 'active' : ''}">
                <a href="${pageContext.request.contextPath}/dashboard">
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    <span>Dashboard IoT</span>
                </a>
            </li>
            <li class="nav-item ${param.activeNav == 'plants' ? 'active' : ''}">
                <a href="${pageContext.request.contextPath}/plants">
                    <svg viewBox="0 0 24 24"><path d="M12 22v-8"/><path d="M12 14c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 10c4 0 6-3 6-7-4 0-6 3-6 7z"/></svg>
                    <span>Hồ sơ Cây trồng</span>
                </a>
            </li>
            <li class="nav-item ${param.activeNav == 'history' ? 'active' : ''}">
                <a href="${pageContext.request.contextPath}/history">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Lịch sử & Nhật ký</span>
                </a>
            </li>
        </ul>
    </div>

    <!-- Admin Only Management Section -->
    <c:if test="${sessionScope.user != null && sessionScope.user.roleCode == 'ADMIN'}">
        <div class="nav-section">
            <div class="nav-section-title">Quản trị Hệ thống</div>
            <ul class="nav-menu">
                <li class="nav-item ${param.activeNav == 'users' ? 'active' : ''}">
                    <a href="${pageContext.request.contextPath}/admin/users">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>Quản lý Tài khoản</span>
                    </a>
                </li>
                <li class="nav-item ${param.activeNav == 'devices' ? 'active' : ''}">
                    <a href="${pageContext.request.contextPath}/admin/devices">
                        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
                        <span>Quản lý Thiết bị</span>
                    </a>
                </li>
                <li class="nav-item ${param.activeNav == 'settings' ? 'active' : ''}">
                    <a href="${pageContext.request.contextPath}/admin/settings">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Cấu hình Ngưỡng Phun</span>
                    </a>
                </li>
            </ul>
        </div>
    </c:if>

    <!-- Account Section -->
    <div class="nav-section">
        <div class="nav-section-title">Cá nhân</div>
        <ul class="nav-menu">
            <li class="nav-item ${param.activeNav == 'profile' ? 'active' : ''}">
                <a href="${pageContext.request.contextPath}/profile">
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Hồ sơ & Đổi Mật Khẩu</span>
                </a>
            </li>
        </ul>
    </div>

    <!-- Footer Profile Widget -->
    <div class="sidebar-footer">
        <c:choose>
            <c:when test="${sessionScope.user != null}">
                <div class="user-profile-widget">
                    <div class="user-avatar">
                        ${sessionScope.user.username.substring(0, 1).toUpperCase()}
                    </div>
                    <div class="user-meta">
                        <div class="name" title="${sessionScope.user.fullName}">${sessionScope.user.fullName}</div>
                        <c:choose>
                            <c:when test="${sessionScope.user.roleCode == 'ADMIN'}">
                                <span class="badge badge-admin role-pill">ADMIN</span>
                            </c:when>
                            <c:when test="${sessionScope.user.roleCode == 'STAFF'}">
                                <span class="badge badge-staff role-pill">STAFF</span>
                            </c:when>
                            <c:otherwise>
                                <span class="badge badge-viewer role-pill">VIEWER</span>
                            </c:otherwise>
                        </c:choose>
                    </div>
                </div>
            </c:when>
            <c:otherwise>
                <a href="${pageContext.request.contextPath}/login" class="btn btn-primary btn-sm" style="width:100%;">
                    Đăng nhập
                </a>
            </c:otherwise>
        </c:choose>
    </div>
</aside>
