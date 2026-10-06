<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Quản lý Tài khoản (ADMIN)</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <style>body{background-color: #f4f8fc;}</style>
</head>
<body>
    <jsp:include page="../header.jsp" />
    
    <div class="container mt-4 mb-5">
        <div class="card shadow-sm border-0">
            <div class="card-header bg-warning text-dark fw-bold py-3">
                <i class="fa-solid fa-users-gear"></i> QUẢN LÝ TÀI KHOẢN HỆ THỐNG
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 text-center">
                        <thead class="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Tên đăng nhập</th>
                                <th>Họ tên</th>
                                <th>Phân Quyền (Role)</th>
                                <th>Trạng thái</th>
                                <th>Khóa / Mở khóa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:forEach var="u" items="${users}">
                                <tr>
                                    <td class="text-muted">#${u.userId}</td>
                                    <td class="fw-bold">${u.username}</td>
                                    <td>${u.fullName}</td>
                                    <td>
                                        <form action="${pageContext.request.contextPath}/admin/users?action=change_role" method="post" class="m-0">
                                            <input type="hidden" name="userId" value="${u.userId}">
                                            <select name="roleCode" class="form-select form-select-sm mx-auto" style="width: auto; display: inline-block;" onchange="this.form.submit()" ${u.userId == sessionScope.user.userId ? 'disabled' : ''}>
                                                <option value="ADMIN"  ${u.roleCode eq 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                                                <option value="STAFF"  ${u.roleCode eq 'STAFF' ? 'selected' : ''}>STAFF</option>
                                                <option value="VIEWER" ${u.roleCode eq 'VIEWER' ? 'selected' : ''}>VIEWER</option>
                                            </select>
                                        </form>
                                    </td>
                                    <td>
                                        <c:choose>
                                            <c:when test="${u.locked}"><span class="badge bg-danger"><i class="fa-solid fa-lock"></i> Bị khóa</span></c:when>
                                            <c:otherwise><span class="badge bg-success"><i class="fa-solid fa-check"></i> Hoạt động</span></c:otherwise>
                                        </c:choose>
                                    </td>
                                    <td>
                                        <c:if test="${u.userId != sessionScope.user.userId}">
                                            <c:choose>
                                                <c:when test="${u.locked}">
                                                    <a href="?action=unlock&id=${u.userId}" class="btn btn-sm btn-outline-success"><i class="fa-solid fa-unlock"></i> Mở khóa</a>
                                                </c:when>
                                                <c:otherwise>
                                                    <a href="?action=lock&id=${u.userId}" class="btn btn-sm btn-outline-danger" onclick="return confirm('Khóa tài khoản ${u.username}?');"><i class="fa-solid fa-lock"></i> Khóa</a>
                                                </c:otherwise>
                                            </c:choose>
                                        </c:if>
                                        <c:if test="${u.userId == sessionScope.user.userId}">
                                            <span class="text-muted small fst-italic">Tài khoản của bạn</span>
                                        </c:if>
                                    </td>
                                </tr>
                            </c:forEach>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
