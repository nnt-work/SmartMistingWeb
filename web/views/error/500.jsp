<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 - Lỗi máy chủ | Smart Misting</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
</head>
<body style="min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;">
    <div class="card" style="max-width: 500px; padding: 40px 32px; border-color: rgba(239, 68, 68, 0.4);">
        <div style="font-size: 4rem; font-weight: 900; color: var(--danger); margin-bottom: 12px;">500</div>
        <h2 style="font-size: 1.35rem; margin-bottom: 12px; color: #fff;">Lỗi Xử Lý Hệ Thống</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">Đã xảy ra lỗi nội bộ máy chủ khi thực hiện yêu cầu. Vui lòng kiểm tra lại kết nối SQL Server hoặc liên hệ quản trị viên.</p>
        <a href="${pageContext.request.contextPath}/dashboard" class="btn btn-primary">
            Quay Lại Dashboard
        </a>
    </div>
</body>
</html>
