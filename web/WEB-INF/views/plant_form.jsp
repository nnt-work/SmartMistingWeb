<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${plant == null ? 'Thêm mới' : 'Cập nhật'} cây trồng</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <style>body{background-color: #f4f8fc;}</style>
</head>
<body>
    <jsp:include page="header.jsp" />
    
    <div class="container mt-4 mb-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-success text-white fw-bold py-3">
                        <i class="fa-solid fa-seedling"></i> ${plant == null ? 'THÊM MỚI CÂY TRỒNG' : 'CẬP NHẬT THÔNG TIN CÂY'}
                    </div>
                    <div class="card-body p-4">
                        <form action="plants?action=save" method="post">
                            <input type="hidden" name="plantId" value="${plant.plantId}">
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold text-secondary">Tên cây <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" name="plantName" value="${plant.plantName}" required placeholder="Ví dụ: Hoa Hồng">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold text-secondary">Loài (Species)</label>
                                <input type="text" class="form-control" name="species" value="${plant.species}" placeholder="Tên khoa học">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold text-secondary">Ngày trồng</label>
                                <input type="date" class="form-control" name="plantedDate" value="${plant.plantedDate}">
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold text-secondary">Ghi chú chăm sóc</label>
                                <textarea class="form-control" name="note" rows="4" placeholder="Nhập ghi chú...">${plant.note}</textarea>
                            </div>
                            
                            <div class="d-flex justify-content-end gap-2">
                                <a href="plants" class="btn btn-light border">Hủy bỏ</a>
                                <button type="submit" class="btn btn-success px-4"><i class="fa-solid fa-floppy-disk"></i> Lưu thông tin</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
