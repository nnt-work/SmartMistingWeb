package controller;

import dao.ActivityLogDAO;
import dao.UserDAO;
import model.AppUser;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet(name = "LoginServlet", urlPatterns = {"/login"})
public class LoginServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("user") != null) {
            response.sendRedirect(request.getContextPath() + "/dashboard");
            return;
        }

        String error = request.getParameter("error");
        if ("account_locked".equals(error)) {
            request.setAttribute("errorMessage", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.");
        } else if ("logged_out".equals(request.getParameter("msg"))) {
            request.setAttribute("successMessage", "Bạn đã đăng xuất thành công.");
        }

        request.getRequestDispatcher("/views/auth/login.jsp").forward(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String username = request.getParameter("username");
        String password = request.getParameter("password");
        String redirect = request.getParameter("redirect");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            request.setAttribute("errorMessage", "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
            request.setAttribute("username", username);
            request.getRequestDispatcher("/views/auth/login.jsp").forward(request, response);
            return;
        }

        try {
            AppUser user = userDAO.login(username.trim(), password);

            if (user == null) {
                // Check if account exists but is locked
                AppUser existing = userDAO.getUserByUsername(username.trim());
                if (existing != null && existing.isIsLocked()) {
                    request.setAttribute("errorMessage", "Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ Admin.");
                } else {
                    request.setAttribute("errorMessage", "Tên đăng nhập hoặc mật khẩu không chính xác.");
                }
                request.setAttribute("username", username);
                request.getRequestDispatcher("/views/auth/login.jsp").forward(request, response);
                return;
            }

            if (user.isIsLocked()) {
                request.setAttribute("errorMessage", "Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ Admin.");
                request.setAttribute("username", username);
                request.getRequestDispatcher("/views/auth/login.jsp").forward(request, response);
                return;
            }

            // Create new session
            HttpSession session = request.getSession(true);
            session.setAttribute("user", user);
            session.setAttribute("userId", user.getUserId());
            session.setAttribute("username", user.getUsername());
            session.setAttribute("fullName", user.getFullName());
            session.setAttribute("role", user.getRoleCode());

            // Log activity
            logDAO.log("ADMIN", null, user.getUserId(), null, "LOGIN",
                    "Người dùng [" + user.getUsername() + " - " + user.getRoleCode() + "] đăng nhập thành công.");

            if (redirect != null && !redirect.trim().isEmpty() && !redirect.contains("/login") && !redirect.contains("/logout")) {
                response.sendRedirect(request.getContextPath() + redirect);
            } else {
                response.sendRedirect(request.getContextPath() + "/dashboard");
            }

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi kết nối cơ sở dữ liệu: " + e.getMessage());
            request.setAttribute("username", username);
            request.getRequestDispatcher("/views/auth/login.jsp").forward(request, response);
        }
    }
}
