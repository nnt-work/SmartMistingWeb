<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Quản Trị Người Dùng & Phân Quyền (RBAC)" />
    <jsp:param name="pageSubtitle" value="Quản lý tài khoản, gán vai trò ADMIN / STAFF / VIEWER và khóa bảo mật" />
</jsp:include>

<!-- Actions Toolbar -->
<div class="card" style="margin-bottom: 24px; padding: 18px 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <!-- Search & Filter Form -->
        <form action="${pageContext.request.contextPath}/admin/users" method="GET" style="display: flex; gap: 10px; flex-grow: 1; max-width: 540px;">
            <input type="text" name="search" class="form-control" placeholder="Tìm theo username, họ tên, email..."
                   value="${searchKeyword != null ? searchKeyword : ''}">
            <select name="role" class="form-control" style="width: 140px;" onchange="this.form.submit()">
                <option value="ALL" ${selectedRole == 'ALL' ? 'selected' : ''}>Tất cả Role</option>
                <option value="ADMIN" ${selectedRole == 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                <option value="STAFF" ${selectedRole == 'STAFF' ? 'selected' : ''}>STAFF</option>
                <option value="VIEWER" ${selectedRole == 'VIEWER' ? 'selected' : ''}>VIEWER</option>
            </select>
            <button type="submit" class="btn btn-primary btn-sm">Tìm</button>
            <c:if test="${not empty searchKeyword || selectedRole != 'ALL'}">
                <a href="${pageContext.request.contextPath}/admin/users" class="btn btn-outline btn-sm">Hủy lọc</a>
            </c:if>
        </form>

        <!-- Create User Button -->
        <div>
            <button type="button" class="btn btn-primary" data-modal-target="createUserModal">
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Tạo Tài Khoản Mới
            </button>
        </div>
    </div>
</div>

<!-- Users Table -->
<div class="card">
    <div class="card-header">
        <div class="card-title">
            <svg style="width:20px;height:20px;color:var(--primary);" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Danh Sách Tài Khoản Hệ Thống (${users.size()} người dùng)</span>
        </div>
    </div>

    <div class="table-responsive">
        <table class="data-table">
            <thead>
            <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Vai trò (Role)</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style="text-align: right;">Hành Động</th>
            </tr>
            </thead>
            <tbody>
            <c:forEach items="${users}" var="u">
                <tr>
                    <td style="color:var(--text-muted); font-size:0.8rem;">#${u.userId}</td>
                    <td>
                        <strong style="color:#fff;">${u.username}</strong>
                        <c:if test="${u.userId == sessionScope.user.userId}">
                            <span class="badge badge-staff" style="margin-left:4px; font-size:0.65rem;">(Bạn)</span>
                        </c:if>
                    </td>
                    <td>${u.fullName}</td>
                    <td style="color:var(--text-secondary); font-size:0.85rem;">${not empty u.email ? u.email : '—'}</td>
                    <td>
                        <c:choose>
                            <c:when test="${u.roleCode == 'ADMIN'}"><span class="badge badge-admin">ADMIN</span></c:when>
                            <c:when test="${u.roleCode == 'STAFF'}"><span class="badge badge-staff">STAFF</span></c:when>
                            <c:otherwise><span class="badge badge-viewer">VIEWER</span></c:otherwise>
                        </c:choose>
                    </td>
                    <td>
                        <c:choose>
                            <c:when test="${u.isLocked}"><span class="badge badge-danger">ĐÃ KHÓA</span></c:when>
                            <c:otherwise><span class="badge badge-success">HOẠT ĐỘNG</span></c:otherwise>
                        </c:choose>
                    </td>
                    <td style="font-size:0.8rem; color:var(--text-secondary);">
                        <fmt:formatDate value="${u.createdAt}" pattern="dd/MM/yyyy" />
                    </td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-outline btn-sm"
                                onclick="openEditUserModal(${u.userId}, '${u.username}', '${u.fullName}', '${u.email}', '${u.roleCode}')">
                            Sửa
                        </button>

                        <c:if test="${u.userId != sessionScope.user.userId}">
                            <!-- Toggle Lock -->
                            <form action="${pageContext.request.contextPath}/admin/users" method="POST" style="display:inline-block; margin-left:4px;">
                                <input type="hidden" name="action" value="toggle_lock">
                                <input type="hidden" name="user_id" value="${u.userId}">
                                <button type="submit" class="btn btn-sm ${u.isLocked ? 'btn-outline' : 'btn-danger'}" 
                                        data-confirm="Bạn có chắc muốn ${u.isLocked ? 'MỞ KHÓA' : 'KHÓA'} tài khoản [${u.username}]?">
                                    ${u.isLocked ? "Mở khóa" : "Khóa"}
                                </button>
                            </form>

                            <!-- Reset Password -->
                            <form action="${pageContext.request.contextPath}/admin/users" method="POST" style="display:inline-block; margin-left:4px;">
                                <input type="hidden" name="action" value="reset_password">
                                <input type="hidden" name="user_id" value="${u.userId}">
                                <button type="submit" class="btn btn-outline btn-sm" title="Đặt lại mật khẩu về 12345"
                                        data-confirm="Đặt lại mật khẩu của [${u.username}] về '12345'?">
                                    Reset PW
                                </button>
                            </form>

                            <!-- Delete User -->
                            <form action="${pageContext.request.contextPath}/admin/users" method="POST" style="display:inline-block; margin-left:4px;">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="user_id" value="${u.userId}">
                                <button type="submit" class="btn btn-danger btn-sm" 
                                        data-confirm="Bạn có chắc chắn muốn xóa tài khoản [${u.username}]?">
                                    Xóa
                                </button>
                            </form>
                        </c:if>
                    </td>
                </tr>
            </c:forEach>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal: Tạo User Mới -->
<div class="modal-overlay" id="createUserModal">
    <div class="modal-container">
        <form action="${pageContext.request.contextPath}/admin/users" method="POST">
            <input type="hidden" name="action" value="create">
            <div class="modal-header">
                <h3>Tạo Tài Khoản Người Dùng Mới</h3>
                <button type="button" class="modal-close" data-modal-close>&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label" for="add_username">Tên đăng nhập (Username) *</label>
                    <input type="text" id="add_username" name="username" class="form-control" placeholder="Ví dụ: staff02, viewer02..." required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_full_name">Họ và tên *</label>
                    <input type="text" id="add_full_name" name="full_name" class="form-control" placeholder="Ví dụ: Nguyễn Văn A" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_email">Địa chỉ Email</label>
                    <input type="email" id="add_email" name="email" class="form-control" placeholder="user@example.com">
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_role">Phân quyền vai trò (Role Code) *</label>
                    <select id="add_role" name="role_code" class="form-control" required>
                        <option value="STAFF">STAFF (Nhân viên chăm sóc - Điều khiển bơm, CRUD cây)</option>
                        <option value="VIEWER">VIEWER (Người xem - Chỉ xem số đo & cây)</option>
                        <option value="ADMIN">ADMIN (Quản trị viên toàn quyền)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_password">Mật khẩu ban đầu *</label>
                    <input type="password" id="add_password" name="password" class="form-control" value="12345" required>
                    <small style="color:var(--text-muted); font-size:0.75rem;">Mặc định: 12345</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" data-modal-close>Hủy</button>
                <button type="submit" class="btn btn-primary">Tạo Tài Khoản</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Sửa User -->
<div class="modal-overlay" id="editUserModal">
    <div class="modal-container">
        <form action="${pageContext.request.contextPath}/admin/users" method="POST">
            <input type="hidden" name="action" value="update">
            <input type="hidden" id="edit_user_id" name="user_id">
            <div class="modal-header">
                <h3>Cập Nhật Thông Tin Tài Khoản</h3>
                <button type="button" class="modal-close" data-modal-close>&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Tên đăng nhập</label>
                    <input type="text" id="edit_username" class="form-control" disabled style="opacity:0.7;">
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_full_name">Họ và tên *</label>
                    <input type="text" id="edit_full_name" name="full_name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_email">Địa chỉ Email</label>
                    <input type="email" id="edit_email" name="email" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_role">Vai trò (Role) *</label>
                    <select id="edit_role" name="role_code" class="form-control" required>
                        <option value="ADMIN">ADMIN (Quản trị viên)</option>
                        <option value="STAFF">STAFF (Nhân viên chăm sóc)</option>
                        <option value="VIEWER">VIEWER (Người xem)</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" data-modal-close>Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu Thay Đổi</button>
            </div>
        </form>
    </div>
</div>

<script>
    function openEditUserModal(id, username, fullName, email, role) {
        document.getElementById('edit_user_id').value = id;
        document.getElementById('edit_username').value = username;
        document.getElementById('edit_full_name').value = fullName;
        document.getElementById('edit_email').value = (email && email !== 'null') ? email : '';
        document.getElementById('edit_role').value = role;
        document.getElementById('editUserModal').classList.add('show');
    }
</script>

<jsp:include page="/views/layout/footer.jsp" />
