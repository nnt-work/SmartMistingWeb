<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Cài Đặt Thiết Bị" />
    <jsp:param name="pageSubtitle" value="Quản lý cấu hình, ngưỡng hoạt động của hệ thống phun sương" />
</jsp:include>

<style>
    .settings-panel {
        background: var(--card-bg, #ffffff);
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        max-width: 800px;
    }
    .form-group {
        margin-bottom: 20px;
    }
    .form-label {
        font-weight: 600;
        color: #374151;
        display: block;
        margin-bottom: 8px;
    }
    .form-control {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #D1D5DB;
        border-radius: 8px;
        font-size: 1rem;
    }
    .form-control:focus {
        border-color: #3B82F6;
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .btn-save {
        background: #3B82F6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
        transition: 0.2s;
    }
    .btn-save:hover { background: #2563EB; }
</style>

<div class="settings-panel">
    <c:if test="${not empty errorMessage}">
        <div style="padding: 12px; background: #FEF2F2; color: #DC2626; border-left: 4px solid #DC2626; border-radius: 4px; margin-bottom: 20px; font-weight: 500;">
            ${errorMessage}
        </div>
    </c:if>
    <c:if test="${not empty successMessage}">
        <div style="padding: 12px; background: #ECFDF5; color: #059669; border-left: 4px solid #059669; border-radius: 4px; margin-bottom: 20px; font-weight: 500;">
            ${successMessage}
        </div>
    </c:if>

    <form action="${pageContext.request.contextPath}/admin/settings" method="post">
        <h4 style="font-size: 1.1rem; color: #111827; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #E5E7EB;">1. Chế độ hoạt động</h4>
        <div class="form-group">
            <label class="form-label">Chế độ (Mode)</label>
            <select name="desiredMode" class="form-control" ${sessionScope.user.roleCode eq 'VIEWER' ? 'disabled' : ''}>
                <option value="AUTO" ${setting.desiredMode == 'AUTO' ? 'selected' : ''}>Tự Động (Auto) - Dựa vào cảm biến</option>
                <option value="MANUAL" ${setting.desiredMode == 'MANUAL' ? 'selected' : ''}>Thủ Công (Manual) - Chỉ bật qua web</option>
            </select>
        </div>

        <h4 style="font-size: 1.1rem; color: #111827; margin-top: 30px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #E5E7EB;">2. Ngưỡng độ ẩm (Chỉ dùng cho Auto)</h4>
        
        <div style="margin-bottom: 20px;">
            <label class="form-label">Gợi ý thiết lập theo loại cây:</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline-primary" style="padding: 5px 15px; border: 1px solid var(--primary); background: transparent; color: var(--primary); border-radius: 20px; cursor: pointer;" onclick="document.getElementById('humidityOn').value=60; document.getElementById('humidityOff').value=80;">🌸 Hoa Lan (60-80%)</button>
                <button type="button" class="btn btn-outline-primary" style="padding: 5px 15px; border: 1px solid var(--warning); background: transparent; color: var(--warning); border-radius: 20px; cursor: pointer;" onclick="document.getElementById('humidityOn').value=20; document.getElementById('humidityOff').value=40;">🌵 Xương Rồng (20-40%)</button>
                <button type="button" class="btn btn-outline-primary" style="padding: 5px 15px; border: 1px solid var(--secondary); background: transparent; color: var(--secondary); border-radius: 20px; cursor: pointer;" onclick="document.getElementById('humidityOn').value=50; document.getElementById('humidityOff').value=70;">🥬 Rau Mầm (50-70%)</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
                <label class="form-label">Ngưỡng BẬT máy bơm (< %)</label>
                <input type="number" id="humidityOn" name="humidityOn" class="form-control" value="${setting.humidityOn}" ${sessionScope.user.roleCode eq 'VIEWER' ? 'disabled' : ''}>
            </div>
            <div class="form-group">
                <label class="form-label">Ngưỡng TẮT máy bơm (> %)</label>
                <input type="number" id="humidityOff" name="humidityOff" class="form-control" value="${setting.humidityOff}" ${sessionScope.user.roleCode eq 'VIEWER' ? 'disabled' : ''}>
            </div>
        </div>

        <h4 style="font-size: 1.1rem; color: #111827; margin-top: 30px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #E5E7EB;">3. Thời gian bảo vệ</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
                <label class="form-label">Thời gian chạy tối đa (Giây)</label>
                <input type="number" name="maxRunSec" class="form-control" value="${setting.maxRunSec}" ${sessionScope.user.roleCode eq 'VIEWER' ? 'disabled' : ''}>
            </div>
            <div class="form-group">
                <label class="form-label">Thời gian nghỉ (Giây)</label>
                <input type="number" name="cooldownSec" class="form-control" value="${setting.cooldownSec}" ${sessionScope.user.roleCode eq 'VIEWER' ? 'disabled' : ''}>
            </div>
        </div>

        <div style="margin-top: 30px;">
            <c:choose>
                <c:when test="${sessionScope.user.roleCode eq 'VIEWER'}">
                    <button type="button" class="btn-save" disabled style="background: #9CA3AF;"><i class="fa-solid fa-lock"></i> Không có quyền lưu</button>
                </c:when>
                <c:otherwise>
                    <button type="submit" class="btn-save"><i class="fa-solid fa-save"></i> Lưu cấu hình</button>
                </c:otherwise>
            </c:choose>
        </div>
    </form>
</div>

<jsp:include page="/views/layout/footer.jsp" />