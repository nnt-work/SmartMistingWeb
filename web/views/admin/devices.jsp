<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Quản Trị Thiết Bị IoT (ESP32)" />
    <jsp:param name="pageSubtitle" value="Quản lý phần cứng bộ điều khiển, nhịp tim kết nối và trạng thái hoạt động" />
</jsp:include>

<div class="card">
    <div class="card-header">
        <div class="card-title">
            <svg style="width:20px;height:20px;color:var(--primary);" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
            <span>Danh Sách Thiết Bị Điều Khiển</span>
        </div>
    </div>

    <div class="table-responsive">
        <table class="data-table">
            <thead>
            <tr>
                <th>ID</th>
                <th>Mã Thiết Bị (Code)</th>
                <th>Tên Bộ Điều Khiển</th>
                <th>Kết Nối Gần Nhất (Heartbeat)</th>
                <th>Trạng Thái Mạng</th>
                <th>Kích Hoạt</th>
                <th style="text-align: right;">Hành Động</th>
            </tr>
            </thead>
            <tbody>
            <c:forEach items="${devices}" var="d">
                <tr>
                    <td style="color:var(--text-muted); font-size:0.8rem;">#${d.deviceId}</td>
                    <td><strong style="color:var(--secondary);">${d.deviceCode}</strong></td>
                    <td style="color:#fff; font-weight:600;">${d.deviceName}</td>
                    <td style="font-size:0.82rem; color:var(--text-secondary);">
                        <c:choose>
                            <c:when test="${d.lastSeen != null}">
                                <fmt:formatDate value="${d.lastSeen}" pattern="dd/MM/yyyy HH:mm:ss" />
                            </c:when>
                            <c:otherwise>Chưa có dữ liệu</c:otherwise>
                        </c:choose>
                    </td>
                    <td>
                        <c:choose>
                            <c:when test="${d.online}">
                                <span class="badge badge-success"><span class="pulse-indicator active"></span> ONLINE</span>
                            </c:when>
                            <c:otherwise>
                                <span class="badge badge-viewer"><span class="pulse-indicator"></span> OFFLINE</span>
                            </c:otherwise>
                        </c:choose>
                    </td>
                    <td>
                        <c:choose>
                            <c:when test="${d.isActive}"><span class="badge badge-staff">HOẠT ĐỘNG</span></c:when>
                            <c:otherwise><span class="badge badge-danger">NGỪNG DÙNG</span></c:otherwise>
                        </c:choose>
                    </td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-outline btn-sm"
                                onclick="openEditDeviceModal(${d.deviceId}, '${d.deviceCode}', '${d.deviceName}', ${d.isActive})">
                            Sửa
                        </button>
                        <form action="${pageContext.request.contextPath}/admin/devices" method="POST" style="display:inline-block; margin-left:4px;">
                            <input type="hidden" name="action" value="ping">
                            <input type="hidden" name="device_id" value="${d.deviceId}">
                            <button type="submit" class="btn btn-primary btn-sm" title="Mô phỏng nhịp tim thiết bị kết nối">
                                Ping
                            </button>
                        </form>
                    </td>
                </tr>
            </c:forEach>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal: Sửa Thiết Bị -->
<div class="modal-overlay" id="editDeviceModal">
    <div class="modal-container">
        <form action="${pageContext.request.contextPath}/admin/devices" method="POST">
            <input type="hidden" name="action" value="update">
            <input type="hidden" id="edit_device_id" name="device_id">
            <div class="modal-header">
                <h3>Cập Nhật Thiết Bị</h3>
                <button type="button" class="modal-close" data-modal-close>&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Mã Thiết Bị</label>
                    <input type="text" id="edit_device_code" class="form-control" disabled style="opacity:0.7;">
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_device_name">Tên Thiết Bị / Vị Trí *</label>
                    <input type="text" id="edit_device_name" name="device_name" class="form-control" required>
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:14px;">
                    <input type="checkbox" id="edit_is_active" name="is_active" style="width:18px;height:18px;accent-color:var(--primary);">
                    <label for="edit_is_active" style="font-size:0.9rem; color:#fff; cursor:pointer;">Kích hoạt thiết bị sử dụng trong hệ thống</label>
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
    function openEditDeviceModal(id, code, name, isActive) {
        document.getElementById('edit_device_id').value = id;
        document.getElementById('edit_device_code').value = code;
        document.getElementById('edit_device_name').value = name;
        document.getElementById('edit_is_active').checked = isActive;
        document.getElementById('editDeviceModal').classList.add('show');
    }
</script>

<jsp:include page="/views/layout/footer.jsp" />
