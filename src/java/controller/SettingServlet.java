package controller;

import dao.ActivityLogDAO;
import dao.MistingSettingDAO;
import model.AppUser;
import model.MistingSetting;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet(name = "SettingServlet", urlPatterns = {"/admin/settings"})
public class SettingServlet extends HttpServlet {

    private final MistingSettingDAO settingDAO = new MistingSettingDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            int deviceId = 1;
            MistingSetting setting = settingDAO.getSettingByDeviceId(deviceId);
            if (setting == null) {
                setting = new MistingSetting();
                setting.setDeviceId(deviceId);
            }

            request.setAttribute("setting", setting);

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

            request.getRequestDispatcher("/views/admin/settings.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp cấu hình: " + e.getMessage());
            request.getRequestDispatcher("/views/admin/settings.jsp").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser currentUser = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (currentUser == null || !currentUser.isAdmin()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Chỉ quản trị viên mới có quyền đổi cấu hình ngưỡng.");
            return;
        }

        try {
            int deviceId = Integer.parseInt(request.getParameter("device_id"));
            double humOn = Double.parseDouble(request.getParameter("humidity_on"));
            double humOff = Double.parseDouble(request.getParameter("humidity_off"));
            int maxRun = Integer.parseInt(request.getParameter("max_run_sec"));
            int cooldown = Integer.parseInt(request.getParameter("cooldown_sec"));
            String mode = request.getParameter("desired_mode");

            // Business rule: Ngưỡng bật phải nhỏ hơn ngưỡng tắt; thời lượng và thời gian nghỉ > 0
            if (humOn >= humOff) {
                session.setAttribute("flashError", "Lỗi logic: Ngưỡng độ ẩm bật (" + humOn + "%) phải nhỏ hơn ngưỡng tắt (" + humOff + "%).");
                response.sendRedirect(request.getContextPath() + "/admin/settings");
                return;
            }

            if (maxRun <= 0 || cooldown <= 0) {
                session.setAttribute("flashError", "Lỗi: Thời gian chạy tối đa và thời gian nghỉ phải lớn hơn 0 giây.");
                response.sendRedirect(request.getContextPath() + "/admin/settings");
                return;
            }

            MistingSetting s = new MistingSetting();
            s.setDeviceId(deviceId);
            s.setHumidityOn(humOn);
            s.setHumidityOff(humOff);
            s.setMaxRunSec(maxRun);
            s.setCooldownSec(cooldown);
            s.setDesiredMode(mode != null ? mode.trim().toUpperCase() : "AUTO");

            settingDAO.updateSetting(s);

            logDAO.log("ADMIN", deviceId, currentUser.getUserId(), null, "SETTING_UPDATE",
                    "[" + currentUser.getUsername() + "] đã đổi ngưỡng phun: Bật < " + humOn + "%, Tắt > " + humOff + "%, Chạy tối đa " + maxRun + "s, Nghỉ " + cooldown + "s, Mode=" + s.getDesiredMode());

            session.setAttribute("flashSuccess", "Cập nhật cấu hình ngưỡng phun sương thành công!");
            response.sendRedirect(request.getContextPath() + "/admin/settings");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Lỗi định dạng dữ liệu cấu hình: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/admin/settings");
        }
    }
}
