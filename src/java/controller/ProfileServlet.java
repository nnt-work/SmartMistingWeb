package controller;

import dao.ActivityLogDAO;
import dao.UserDAO;
import model.AppUser;
import util.PasswordUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet(name = "ProfileServlet", urlPatterns = {"/profile", "/change-password"})
public class ProfileServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        try {
            AppUser fresh = userDAO.getUserById(user.getUserId());
            if (fresh != null) {
                request.setAttribute("userProfile", fresh);
            } else {
                request.setAttribute("userProfile", user);
            }

            if (session.getAttribute("flashSuccess") != null) {
                request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                session.removeAttribute("flashSuccess");
            }
            if (session.getAttribute("flashError") != null) {
                request.setAttribute("errorMessage", session.getAttribute("flashError"));
                session.removeAttribute("flashError");
            }

            request.getRequestDispatcher("/views/auth/profile.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp thông tin cá nhân: " + e.getMessage());
            request.getRequestDispatcher("/views/auth/profile.jsp").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        String action = request.getParameter("action");

        try {
            if ("update_profile".equalsIgnoreCase(action)) {
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");

                if (fullName == null || fullName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Họ và tên không được để trống!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                userDAO.updateProfile(user.getUserId(), fullName.trim(), email != null ? email.trim() : "");
                user.setFullName(fullName.trim());
                user.setEmail(email != null ? email.trim() : "");
                session.setAttribute("fullName", user.getFullName());

                logDAO.log("ADMIN", null, user.getUserId(), null, "PROFILE_UPDATE",
                        "[" + user.getUsername() + "] đã cập nhật hồ sơ cá nhân.");

                session.setAttribute("flashSuccess", "Cập nhật thông tin cá nhân thành công!");

            } else if ("change_password".equalsIgnoreCase(action)) {
                String currentPass = request.getParameter("current_password");
                String newPass = request.getParameter("new_password");
                String confirmPass = request.getParameter("confirm_password");

                if (currentPass == null || currentPass.trim().isEmpty()
                        || newPass == null || newPass.trim().isEmpty()) {
                    session.setAttribute("flashError", "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                if (!newPass.equals(confirmPass)) {
                    session.setAttribute("flashError", "Mật khẩu xác nhận không khớp!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                AppUser fresh = userDAO.getUserById(user.getUserId());
                if (fresh == null || !PasswordUtil.verify(currentPass, fresh.getPasswordHash())) {
                    session.setAttribute("flashError", "Mật khẩu hiện tại không chính xác!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                userDAO.updatePassword(user.getUserId(), newPass);
                logDAO.log("ADMIN", null, user.getUserId(), null, "PASSWORD_CHANGE",
                        "[" + user.getUsername() + "] đã tự đổi mật khẩu cá nhân thành công.");

                session.setAttribute("flashSuccess", "Đổi mật khẩu thành công!");
            }

            response.sendRedirect(request.getContextPath() + "/profile");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Lỗi xử lý: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/profile");
        }
    }
}
