<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | Smart Misting</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
</head>
<body style="min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;">
    <div class="card" style="max-width: 480px; padding: 40px 32px;">
        <div style="font-size: 4rem; font-weight: 900; color: var(--secondary); margin-bottom: 12px;">404</div>
        <h2 style="font-size: 1.35rem; margin-bottom: 12px; color: var(--text-primary);">Page Not Found</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">The requested resource could not be found or has been moved.</p>
        <a href="${pageContext.request.contextPath}/dashboard" class="btn btn-primary">
            Back to Dashboard
        </a>
    </div>
</body>
</html>
