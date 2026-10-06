<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 - Từ chối truy cập | Smart Misting</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
    <style>
        .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
        }
        .error-card {
            max-width: 500px;
            background: var(--bg-card);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: var(--radius-lg);
            padding: 40px 32px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .error-code {
            font-size: 4.5rem;
            font-weight: 900;
            color: var(--danger);
            line-height: 1;
            margin-bottom: 12px;
        }
    </style>
</head>
<body>
<div class="error-container">
    <div class="error-card">
        <div class="error-code">403</div>
        <h2 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 12px; color: #fff;">
            Từ Chối Truy Cập (Access Denied)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.6;">
            ${errorMessage != null ? errorMessage : "Bạn không có quyền hạn thích hợp để truy cập chức năng này theo bảng phân quyền RBAC."}
        </p>
        <div style="display: flex; justify-content: center; gap: 12px;">
            <a href="${pageContext.request.contextPath}/dashboard" class="btn btn-primary">
                Quay lại Dashboard
            </a>
            <a href="${pageContext.request.contextPath}/logout" class="btn btn-outline">
                Đăng nhập tài khoản khác
            </a>
        </div>
    </div>
</div>
</body>
</html>
