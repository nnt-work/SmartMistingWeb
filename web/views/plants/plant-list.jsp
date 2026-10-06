<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Quản Lý Hồ Sơ Cây Trồng" />
    <jsp:param name="pageSubtitle" value="Theo dõi các loại cây, loài, thời điểm trồng và lưu ý chăm sóc" />
</jsp:include>

<!-- Actions Toolbar -->
<div class="card" style="margin-bottom: 24px; padding: 18px 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <!-- Search Box -->
        <form action="${pageContext.request.contextPath}/plants" method="GET" style="display: flex; gap: 10px; flex-grow: 1; max-width: 480px;">
            <input type="text" name="search" class="form-control" placeholder="Tìm kiếm theo tên cây, loài, ghi chú..."
                   value="${searchKeyword != null ? searchKeyword : ''}">
            <button type="submit" class="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Tìm
            </button>
            <c:if test="${not empty searchKeyword}">
                <a href="${pageContext.request.contextPath}/plants" class="btn btn-outline btn-sm">Hủy lọc</a>
            </c:if>
        </form>

        <!-- Add Plant Button (Only ADMIN and STAFF) -->
        <div>
            <c:choose>
                <c:when test="${sessionScope.user.viewer}">
                    <span class="badge badge-viewer">Tài khoản VIEWER: Không có quyền thêm cây</span>
                </c:when>
                <c:otherwise>
                    <button type="button" class="btn btn-primary" data-modal-target="addPlantModal">
                        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Thêm Cây Mới
                    </button>
                </c:otherwise>
            </c:choose>
        </div>
    </div>
</div>

<!-- Plants Table -->
<div class="card">
    <div class="card-header">
        <div class="card-title">
            <svg style="width:20px;height:20px;color:var(--primary);" viewBox="0 0 24 24"><path d="M12 22v-8"/><path d="M12 14c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 10c4 0 6-3 6-7-4 0-6 3-6 7z"/></svg>
            <span>Danh Sách Cây Trồng (${totalCount} cây)</span>
        </div>
    </div>

    <div class="table-responsive">
        <table class="data-table">
            <thead>
            <tr>
                <th>ID</th>
                <th>Tên Cây Trồng</th>
                <th>Loài (Species)</th>
                <th>Ngày Trồng</th>
                <th>Ghi Chú Chăm Sóc</th>
                <th>Người Tạo</th>
                <th style="text-align: right;">Thao Tác</th>
            </tr>
            </thead>
            <tbody>
            <c:forEach items="${plants}" var="p">
                <tr>
                    <td style="color:var(--text-muted); font-size:0.8rem;">#${p.plantId}</td>
                    <td>
                        <strong style="color:#fff; font-size:0.95rem;">${p.plantName}</strong>
                    </td>
                    <td>
                        <span class="badge badge-staff">${not empty p.species ? p.species : 'Chưa phân loài'}</span>
                    </td>
                    <td>
                        <c:choose>
                            <c:when test="${p.plantedDate != null}">
                                <fmt:formatDate value="${p.plantedDate}" pattern="dd/MM/yyyy" />
                            </c:when>
                            <c:otherwise>—</c:otherwise>
                        </c:choose>
                    </td>
                    <td style="max-width: 260px; color:var(--text-secondary); font-size:0.85rem;">
                        ${not empty p.note ? p.note : '—'}
                    </td>
                    <td>
                        <span style="font-size:0.8rem; color:var(--text-muted);">${not empty p.creatorName ? p.creatorName : 'Hệ thống'}</span>
                    </td>
                    <td style="text-align: right;">
                        <c:choose>
                            <c:when test="${sessionScope.user.viewer}">
                                <span class="badge badge-viewer">Chỉ xem</span>
                            </c:when>
                            <c:otherwise>
                                <button type="button" class="btn btn-outline btn-sm"
                                        onclick="openEditModal(${p.plantId}, '${p.plantName}', '${p.species}', '${p.plantedDate}', '${p.note}')">
                                    Sửa
                                </button>
                                <form action="${pageContext.request.contextPath}/plants" method="POST" style="display:inline-block; margin-left:6px;">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="plant_id" value="${p.plantId}">
                                    <button type="submit" class="btn btn-danger btn-sm" data-confirm="Bạn có chắc chắn muốn xóa hồ sơ cây [${p.plantName}]?">
                                        Xóa
                                    </button>
                                </form>
                            </c:otherwise>
                        </c:choose>
                    </td>
                </tr>
            </c:forEach>
            <c:if test="${empty plants}">
                <tr>
                    <td colspan="7" style="text-align:center; padding:36px; color:var(--text-muted);">
                        Không tìm thấy hồ sơ cây trồng nào phù hợp.
                    </td>
                </tr>
            </c:if>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <c:if test="${totalPages > 1}">
        <div class="pagination">
            <c:if test="${currentPage > 1}">
                <a href="${pageContext.request.contextPath}/plants?page=${currentPage - 1}&search=${searchKeyword}" class="page-link">« Trước</a>
            </c:if>
            <c:forEach begin="1" end="${totalPages}" var="i">
                <a href="${pageContext.request.contextPath}/plants?page=${i}&search=${searchKeyword}"
                   class="page-link ${currentPage == i ? 'active' : ''}">${i}</a>
            </c:forEach>
            <c:if test="${currentPage < totalPages}">
                <a href="${pageContext.request.contextPath}/plants?page=${currentPage + 1}&search=${searchKeyword}" class="page-link">Sau »</a>
            </c:if>
        </div>
    </c:if>
</div>

<!-- Modal: Thêm Cây Mới -->
<div class="modal-overlay" id="addPlantModal">
    <div class="modal-container">
        <form action="${pageContext.request.contextPath}/plants" method="POST">
            <input type="hidden" name="action" value="add">
            <div class="modal-header">
                <h3>Thêm Hồ Sơ Cây Trồng Mới</h3>
                <button type="button" class="modal-close" data-modal-close>&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label" for="add_plant_name">Tên cây trồng *</label>
                    <input type="text" id="add_plant_name" name="plant_name" class="form-control" placeholder="Ví dụ: Lan Hồ Điệp, Dương Xỉ..." required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_species">Loài / Giống cây</label>
                    <input type="text" id="add_species" name="species" class="form-control" placeholder="Ví dụ: Phalaenopsis, Nephrolepis...">
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_planted_date">Ngày trồng</label>
                    <input type="date" id="add_planted_date" name="planted_date" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label" for="add_note">Ghi chú chăm sóc / Ngưỡng ẩm</label>
                    <textarea id="add_note" name="note" class="form-control" rows="3" placeholder="Ví dụ: Ưa ẩm cao, tưới sương 2 lần/ngày..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" data-modal-close>Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu Cây Mới</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Sửa Cây -->
<div class="modal-overlay" id="editPlantModal">
    <div class="modal-container">
        <form action="${pageContext.request.contextPath}/plants" method="POST">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" id="edit_plant_id" name="plant_id">
            <div class="modal-header">
                <h3>Cập Nhật Hồ Sơ Cây Trồng</h3>
                <button type="button" class="modal-close" data-modal-close>&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label" for="edit_plant_name">Tên cây trồng *</label>
                    <input type="text" id="edit_plant_name" name="plant_name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_species">Loài / Giống cây</label>
                    <input type="text" id="edit_species" name="species" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_planted_date">Ngày trồng</label>
                    <input type="date" id="edit_planted_date" name="planted_date" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit_note">Ghi chú chăm sóc / Ngưỡng ẩm</label>
                    <textarea id="edit_note" name="note" class="form-control" rows="3"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" data-modal-close>Hủy</button>
                <button type="submit" class="btn btn-primary">Cập Nhật</button>
            </div>
        </form>
    </div>
</div>

<script>
    function openEditModal(id, name, species, date, note) {
        document.getElementById('edit_plant_id').value = id;
        document.getElementById('edit_plant_name').value = name;
        document.getElementById('edit_species').value = (species && species !== 'null') ? species : '';
        document.getElementById('edit_planted_date').value = (date && date !== 'null') ? date : '';
        document.getElementById('edit_note').value = (note && note !== 'null') ? note : '';
        document.getElementById('editPlantModal').classList.add('show');
    }
</script>

<jsp:include page="/views/layout/footer.jsp" />
