package controller;

import dao.ActivityLogDAO;
import dao.DeviceDAO;
import model.AppUser;
import model.Device;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

@WebServlet(name = "DeviceServlet", urlPatterns = {"/admin/devices"})
public class DeviceServlet extends HttpServlet {

    private final DeviceDAO deviceDAO = new DeviceDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            List<Device> devices = deviceDAO.getAllDevices();
            request.setAttribute("devices", devices);

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

            request.getRequestDispatcher("/views/admin/devices.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp danh sách thiết bị: " + e.getMessage());
            request.getRequestDispatcher("/views/admin/devices.jsp").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser currentUser = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (currentUser == null || !currentUser.isAdmin()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Chỉ quản trị viên mới có quyền quản lý thiết bị.");
            return;
        }

        String action = request.getParameter("action");

        try {
            if ("update".equalsIgnoreCase(action)) {
                int deviceId = Integer.parseInt(request.getParameter("device_id"));
                String deviceName = request.getParameter("device_name");
                boolean isActive = "on".equalsIgnoreCase(request.getParameter("is_active")) || "true".equalsIgnoreCase(request.getParameter("is_active"));

                Device d = deviceDAO.getDeviceById(deviceId);
                if (d != null) {
                    d.setDeviceName(deviceName != null ? deviceName.trim() : d.getDeviceName());
                    d.setIsActive(isActive);
                    deviceDAO.updateDevice(d);

                    logDAO.log("ADMIN", deviceId, currentUser.getUserId(), null, "DEVICE_UPDATE",
                            "[" + currentUser.getUsername() + "] đã cập nhật thiết bị [" + d.getDeviceCode() + "].");

                    session.setAttribute("flashSuccess", "Cập nhật thiết bị [" + d.getDeviceCode() + "] thành công.");
                }
            } else if ("ping".equalsIgnoreCase(action)) {
                int deviceId = Integer.parseInt(request.getParameter("device_id"));
                deviceDAO.updateLastSeen(deviceId);
                session.setAttribute("flashSuccess", "Đã cập nhật nhịp tim (heartbeat) thiết bị thành công!");
            }

            response.sendRedirect(request.getContextPath() + "/admin/devices");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Lỗi thiết bị: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/admin/devices");
        }
    }
}
