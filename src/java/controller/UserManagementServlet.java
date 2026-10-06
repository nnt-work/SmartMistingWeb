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
import java.util.List;

@WebServlet(name = "UserManagementServlet", urlPatterns = {"/admin/users"})
public class UserManagementServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("search");
        String roleFilter = request.getParameter("role");

        try {
            List<AppUser> users = userDAO.getAllUsers(keyword, roleFilter);

            request.setAttribute("users", users);
            request.setAttribute("searchKeyword", keyword);
            request.setAttribute("selectedRole", roleFilter != null ? roleFilter : "ALL");

            // Pop flash messages if any
            HttpSession session = request.getSession(false);
            if (session != null) {
                if (session.getAttribute("flashSuccess") != null) {
                    request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                    session.removeAttribute("flashSuccess");
                }
                if (session.getAttribute("flashError") != null) {
                    request.setAttribute("errorMessage", session.getAttribute("flashError"));
                    session.removeAttribute("flashError");
                }
            }

            request.getRequestDispatcher("/views/admin/users.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp danh sách tài khoản: " + e.getMessage());
            request.getRequestDispatcher("/views/admin/users.jsp").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser currentUser = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (currentUser == null || !currentUser.isAdmin()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Chỉ quản trị viên mới có quyền thao tác quản lý người dùng.");
            return;
        }

        String action = request.getParameter("action");

        try {
            if ("create".equalsIgnoreCase(action)) {
                String username = request.getParameter("username");
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");
                String roleCode = request.getParameter("role_code");
                String password = request.getParameter("password");

                if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
                    session.setAttribute("flashError", "Tên đăng nhập và mật khẩu không được để trống!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                if (userDAO.getUserByUsername(username.trim()) != null) {
                    session.setAttribute("flashError", "Tên đăng nhập [" + username.trim() + "] đã tồn tại trong hệ thống!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser newUser = new AppUser();
                newUser.setUsername(username.trim());
                newUser.setFullName(fullName != null ? fullName.trim() : username.trim());
                newUser.setEmail(email != null ? email.trim() : "");
                newUser.setRoleCode(roleCode != null ? roleCode.trim().toUpperCase() : "STAFF");

                userDAO.createUser(newUser, password);
                logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_CREATE",
                        "[" + currentUser.getUsername() + "] đã tạo tài khoản mới: " + newUser.getUsername() + " (" + newUser.getRoleCode() + ")");

                session.setAttribute("flashSuccess", "Đã tạo tài khoản [" + newUser.getUsername() + "] thành công!");

            } else if ("update".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");
                String roleCode = request.getParameter("role_code");

                AppUser target = userDAO.getUserById(targetId);
                if (target == null) {
                    session.setAttribute("flashError", "Không tìm thấy người dùng cần cập nhật!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                // Business rule: Do not demote the last active admin
                if (target.isAdmin() && !"ADMIN".equalsIgnoreCase(roleCode)) {
                    if (userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Không thể hạ quyền Quản trị viên duy nhất trong hệ thống!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }
                }

                target.setFullName(fullName != null ? fullName.trim() : target.getFullName());
                target.setEmail(email != null ? email.trim() : target.getEmail());
                target.setRoleCode(roleCode != null ? roleCode.trim().toUpperCase() : target.getRoleCode());

                userDAO.updateUser(target);
                logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_UPDATE",
                        "[" + currentUser.getUsername() + "] đã cập nhật thông tin tài khoản [" + target.getUsername() + "].");

                session.setAttribute("flashSuccess", "Cập nhật tài khoản [" + target.getUsername() + "] thành công!");

            } else if ("toggle_lock".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                if (targetId == currentUser.getUserId()) {
                    session.setAttribute("flashError", "Bạn không thể tự khóa tài khoản của chính mình!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    boolean newLockState = !target.isIsLocked();
                    // Prevent locking last admin
                    if (target.isAdmin() && newLockState && userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Không thể khóa Quản trị viên đang hoạt động duy nhất!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }

                    userDAO.setLockStatus(targetId, newLockState);
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_LOCK",
                            "[" + currentUser.getUsername() + "] đã " + (newLockState ? "KHÓA" : "MỞ KHÓA") + " tài khoản [" + target.getUsername() + "].");

                    session.setAttribute("flashSuccess", (newLockState ? "Đã khóa" : "Đã mở khóa") + " tài khoản [" + target.getUsername() + "].");
                }

            } else if ("reset_password".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    userDAO.updatePassword(targetId, "12345");
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "PASSWORD_RESET",
                            "[" + currentUser.getUsername() + "] đã đặt lại mật khẩu cho [" + target.getUsername() + "] về mặc định: 12345");

                    session.setAttribute("flashSuccess", "Đã đặt lại mật khẩu cho [" + target.getUsername() + "] thành: 12345");
                }

            } else if ("delete".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                if (targetId == currentUser.getUserId()) {
                    session.setAttribute("flashError", "Bạn không thể tự xóa tài khoản của chính mình!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    if (target.isAdmin() && userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Không thể xóa Quản trị viên đang hoạt động duy nhất!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }

                    userDAO.deleteUser(targetId);
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_DELETE",
                            "[" + currentUser.getUsername() + "] đã xóa tài khoản [" + target.getUsername() + "].");

                    session.setAttribute("flashSuccess", "Đã xóa tài khoản [" + target.getUsername() + "].");
                }
            }

            response.sendRedirect(request.getContextPath() + "/admin/users");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Lỗi thao tác người dùng: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/admin/users");
        }
    }
}
