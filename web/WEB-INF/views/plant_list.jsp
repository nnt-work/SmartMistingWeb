<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Danh sách cây trồng</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <style>body{background-color: #f4f8fc;}</style>
</head>
<body>
    <jsp:include page="header.jsp" />
    
    <div class="container mt-4 mb-5">
        <div class="card shadow-sm border-0">
            <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
                <span class="fw-bold text-secondary"><i class="fa-solid fa-seedling"></i> HỒ SƠ CÂY TRỒNG</span>
                <c:if test="${sessionScope.user.roleCode ne 'VIEWER'}">
                    <a href="plants?action=create" class="btn btn-sm btn-success shadow-sm"><i class="fa-solid fa-plus"></i> Thêm mới</a>
                </c:if>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">ID</th>
                                <th>Tên cây</th>
                                <th>Loài (Species)</th>
                                <th>Ngày trồng</th>
                                <th>Ghi chú</th>
                                <c:if test="${sessionScope.user.roleCode ne 'VIEWER'}">
                                    <th class="text-end pe-3">Hành động</th>
                                </c:if>
                            </tr>
                        </thead>
                        <tbody>
                            <c:forEach var="p" items="${plants}">
                                <tr>
                                    <td class="ps-3 fw-bold text-muted">#${p.plantId}</td>
                                    <td class="text-success fw-bold">${p.plantName}</td>
                                    <td><span class="fst-italic">${p.species}</span></td>
                                    <td>${p.plantedDate}</td>
                                    <td><span class="text-muted small">${p.note}</span></td>
                                    <c:if test="${sessionScope.user.roleCode ne 'VIEWER'}">
                                        <td class="text-end pe-3">
                                            <a href="plants?action=edit&id=${p.plantId}" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-pen"></i></a>
                                            <a href="plants?action=delete&id=${p.plantId}" class="btn btn-sm btn-outline-danger" onclick="return confirm('Bạn có chắc muốn xóa hồ sơ cây: ${p.plantName}?');"><i class="fa-solid fa-trash"></i></a>
                                        </td>
                                    </c:if>
                                </tr>
                            </c:forEach>
                            <c:if test="${empty plants}">
                                <tr><td colspan="6" class="text-center py-4 text-muted">Chưa có dữ liệu cây trồng.</td></tr>
                            </c:if>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card-footer bg-white d-flex justify-content-center py-3 border-top-0">
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <c:forEach begin="1" end="${totalPages}" var="i">
                            <li class="page-item ${i == currentPage ? 'active' : ''}">
                                <a class="page-link" href="plants?page=${i}">${i}</a>
                            </li>
                        </c:forEach>
                    </ul>
                </nav>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
