<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
    <title>Login - Smart Misting</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
        }
        .app-logo {
            width: 80px;
            height: 80px;
            background: #ECFDF5;
            color: #10B981;
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            margin: 0 auto 2rem auto;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);
        }
        .login-title {
            font-weight: 800;
            font-size: 1.8rem;
            color: #111827;
            text-align: center;
            margin-bottom: 0.5rem;
        }
        .login-subtitle {
            color: #6B7280;
            text-align: center;
            margin-bottom: 2.5rem;
            font-size: 0.95rem;
        }
        .form-control-modern {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 16px;
            padding: 1rem 1.2rem;
            font-size: 1rem;
            transition: all 0.2s;
        }
        .form-control-modern:focus {
            background: #ffffff;
            border-color: #10B981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        .btn-login {
            background: #10B981;
            color: white;
            border: none;
            border-radius: 16px;
            padding: 1.1rem;
            width: 100%;
            font-weight: 700;
            font-size: 1.1rem;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            margin-top: 1rem;
            transition: 0.2s;
        }
        .btn-login:hover {
            background: #059669;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="app-logo">
            <i class="fa-solid fa-leaf"></i>
        </div>
        <h1 class="login-title">Welcome Back</h1>
        <p class="login-subtitle">Control your misting system from anywhere.</p>

        <% 
            String error = (String) request.getAttribute("errorMessage"); 
            if (request.getParameter("error") != null && request.getParameter("error").equals("account_locked")) {
                error = "Tài khoản của bạn đã bị khóa.";
            }
        %>
        <% if (error != null) { %>
            <div class="alert alert-danger rounded-4 py-2 text-center" role="alert" style="font-size: 0.9rem;">
                <i class="fa-solid fa-circle-exclamation"></i> <%= error %>
            </div>
        <% } %>

        <form action="${pageContext.request.contextPath}/login" method="post">
            <div class="mb-3">
                <input type="text" class="form-control form-control-modern" name="username" placeholder="Username" required autofocus>
            </div>
            <div class="mb-4">
                <input type="password" class="form-control form-control-modern" name="password" placeholder="Password" required>
            </div>
            <button type="submit" class="btn-login">Log In</button>
        </form>
        
        <div class="text-center mt-5" style="color: #9CA3AF; font-size: 0.85rem;">
            Demo: admin01 / staff01 / viewer01<br>Pass: 12345
        </div>
    </div>
</body>
</html>
