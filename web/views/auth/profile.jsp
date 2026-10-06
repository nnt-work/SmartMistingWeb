<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Hồ Sơ Cá Nhân & Đổi Mật Khẩu" />
    <jsp:param name="pageSubtitle" value="Quản lý thông tin tài khoản và cập nhật mật khẩu bảo mật" />
</jsp:include>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px;">
    <!-- Profile Card -->
    <div class="card">
        <div class="card-header">
            <div class="card-title">
                <svg style="width:20px;height:20px;color:var(--primary);" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Thông Tin Tài Khoản</span>
            </div>
            <c:choose>
                <c:when test="${userProfile.roleCode == 'ADMIN'}"><span class="badge badge-admin">ADMIN</span></c:when>
                <c:when test="${userProfile.roleCode == 'STAFF'}"><span class="badge badge-staff">STAFF</span></c:when>
                <c:otherwise><span class="badge badge-viewer">VIEWER</span></c:otherwise>
            </c:choose>
        </div>

        <form action="${pageContext.request.contextPath}/profile" method="POST">
            <input type="hidden" name="action" value="update_profile">

            <div class="form-group">
                <label class="form-label">Tên đăng nhập (Username)</label>
                <input type="text" class="form-control" value="${userProfile.username}" disabled style="opacity: 0.7;">
                <small style="color:var(--text-muted); font-size:0.75rem;">Username là định danh cố định không thể thay đổi.</small>
            </div>

            <div class="form-group">
                <label class="form-label" for="full_name">Họ và tên *</label>
                <input type="text" id="full_name" name="full_name" class="form-control" value="${userProfile.fullName}" required>
            </div>

            <div class="form-group">
                <label class="form-label" for="email">Địa chỉ Email</label>
                <input type="email" id="email" name="email" class="form-control" value="${userProfile.email}">
            </div>

            <div class="form-group">
                <label class="form-label">Vai trò hiện tại</label>
                <input type="text" class="form-control" value="${userProfile.roleCode}" disabled style="opacity: 0.7;">
                <small style="color:var(--text-muted); font-size:0.75rem;">Phân quyền chỉ do Quản trị viên (Admin) thay đổi.</small>
            </div>

            <div style="margin-top: 24px; display:flex; justify-content:flex-end;">
                <button type="submit" class="btn btn-primary">
                    Lưu Thay Đổi Hồ Sơ
                </button>
            </div>
        </form>
    </div>

    <!-- Change Password Card -->
    <div class="card" id="change-password">
        <div class="card-header">
            <div class="card-title">
                <svg style="width:20px;height:20px;color:var(--secondary);" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Đổi Mật Khẩu Cá Nhân</span>
            </div>
        </div>

        <form action="${pageContext.request.contextPath}/profile" method="POST">
            <input type="hidden" name="action" value="change_password">

            <div class="form-group">
                <label class="form-label" for="current_password">Mật khẩu hiện tại *</label>
                <input type="password" id="current_password" name="current_password" class="form-control" placeholder="Nhập mật khẩu hiện tại..." required>
            </div>

            <div class="form-group">
                <label class="form-label" for="new_password">Mật khẩu mới *</label>
                <input type="password" id="new_password" name="new_password" class="form-control" placeholder="Nhập mật khẩu mới..." required>
            </div>

            <div class="form-group">
                <label class="form-label" for="confirm_password">Xác nhận mật khẩu mới *</label>
                <input type="password" id="confirm_password" name="confirm_password" class="form-control" placeholder="Nhập lại mật khẩu mới..." required>
            </div>

            <div style="margin-top: 24px; display:flex; justify-content:flex-end;">
                <button type="submit" class="btn btn-primary">
                    Đổi Mật Khẩu
                </button>
            </div>
        </form>
    </div>
</div>

<jsp:include page="/views/layout/footer.jsp" />
