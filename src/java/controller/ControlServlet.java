package controller;

import dao.ActivityLogDAO;
import dao.ControlCommandDAO;
import dao.MistingSettingDAO;
import dao.SensorReadingDAO;
import model.AppUser;
import model.ControlCommand;
import model.MistingSetting;
import model.SensorReading;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet(name = "ControlServlet", urlPatterns = {"/control"})
public class ControlServlet extends HttpServlet {

    private final ControlCommandDAO commandDAO = new ControlCommandDAO();
    private final SensorReadingDAO sensorDAO = new SensorReadingDAO();
    private final MistingSettingDAO settingDAO = new MistingSettingDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        // Server-side RBAC check: Only ADMIN and STAFF can control hardware
        if (user.isViewer()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Tài khoản VIEWER không có quyền điều khiển bơm!");
            return;
        }

        String action = request.getParameter("action");
        int deviceId = 1;
        try {
            deviceId = Integer.parseInt(request.getParameter("device_id"));
        } catch (Exception ignored) {
        }

        try {
            SensorReading latest = sensorDAO.getLatestReading(deviceId);
            MistingSetting setting = settingDAO.getSettingByDeviceId(deviceId);

            if (latest == null) {
                latest = new SensorReading();
                latest.setDeviceId(deviceId);
                latest.setTemperatureC(28.0);
                latest.setHumidityPct(55.0);
                latest.setWaterOk(true);
                latest.setSensorOk(true);
                latest.setPumpOn(false);
                latest.setReportedMode("MANUAL");
            }

            String commandType = "";
            String payload = "";
            String message = "";
            boolean isError = false;

            if ("start_pump".equalsIgnoreCase(action)) {
                // Safety check: Don't start pump if water is empty
                if (Boolean.FALSE.equals(latest.getWaterOk())) {
                    isError = true;
                    message = "CẢNH BÁO AN TOÀN: Bể cạn nước! Không thể bật bơm để bảo vệ thiết bị.";
                } else if (!latest.isSensorOk()) {
                    isError = true;
                    message = "CẢNH BÁO: Cảm biến đang gặp sự cố. Bơm bị khóa an toàn.";
                } else {
                    commandType = "START";
                    payload = "{\"duration_sec\": " + (setting != null ? setting.getMaxRunSec() : 10) + "}";
                    message = "Đã gửi lệnh BẬT BƠM PHUN SƯƠNG thành công (thời lượng " + (setting != null ? setting.getMaxRunSec() : 10) + "s).";

                    // Update sensor telemetry
                    latest.setPumpOn(true);
                    latest.setReportedMode(setting != null ? setting.getDesiredMode() : "MANUAL");
                    latest.setPacketId("CMD-START-" + System.currentTimeMillis());
                    sensorDAO.addReading(latest);
                }
            } else if ("stop_pump".equalsIgnoreCase(action)) {
                commandType = "STOP";
                payload = "{\"force\": true}";
                message = "Đã gửi lệnh TẮT BƠM PHUN SƯƠNG thành công.";

                // Update sensor telemetry
                latest.setPumpOn(false);
                latest.setPacketId("CMD-STOP-" + System.currentTimeMillis());
                sensorDAO.addReading(latest);
            } else if ("set_mode".equalsIgnoreCase(action)) {
                String targetMode = request.getParameter("mode");
                if ("AUTO".equalsIgnoreCase(targetMode) || "MANUAL".equalsIgnoreCase(targetMode)) {
                    commandType = "SET_MODE";
                    payload = "{\"mode\": \"" + targetMode.toUpperCase() + "\"}";
                    message = "Đã chuyển chế độ vận hành sang: " + targetMode.toUpperCase();

                    // Update DB setting
                    settingDAO.updateDesiredMode(deviceId, targetMode.toUpperCase());

                    // If switched to AUTO, simulate safety pump evaluation
                    if ("AUTO".equalsIgnoreCase(targetMode)) {
                        double hum = latest.getHumidityPct() != null ? latest.getHumidityPct() : 50.0;
                        double onThreshold = setting != null ? setting.getHumidityOn() : 60.0;
                        boolean shouldPump = (hum < onThreshold) && Boolean.TRUE.equals(latest.getWaterOk()) && latest.isSensorOk();
                        latest.setPumpOn(shouldPump);
                    }
                    latest.setReportedMode(targetMode.toUpperCase());
                    latest.setPacketId("CMD-MODE-" + System.currentTimeMillis());
                    sensorDAO.addReading(latest);
                }
            } else if ("toggle_water".equalsIgnoreCase(action)) {
                // Testing helper to simulate water sensor state
                boolean currentWater = latest.getWaterOk() != null ? latest.getWaterOk() : true;
                latest.setWaterOk(!currentWater);
                if (!latest.getWaterOk()) {
                    latest.setPumpOn(false); // Failsafe stop pump
                }
                latest.setPacketId("SIM-WATER-" + System.currentTimeMillis());
                sensorDAO.addReading(latest);
                message = "Đã mô phỏng mức nước: " + (latest.getWaterOk() ? "BÌNH NƯỚC ĐẦY (OK)" : "HẾT NƯỚC (CẢNH BÁO)");
            }

            // Create command and activity log if command was executed
            if (!commandType.isEmpty() && !isError) {
                ControlCommand cmd = new ControlCommand();
                cmd.setDeviceId(deviceId);
                cmd.setUserId(user.getUserId());
                cmd.setCommandType(commandType);
                cmd.setPayloadJson(payload);
                cmd.setStatus("ACKED");
                int cmdId = commandDAO.createCommand(cmd);

                logDAO.log("MISTING", deviceId, user.getUserId(), cmdId, commandType,
                        "[" + user.getFullName() + " (" + user.getRoleCode() + ")] thực hiện lệnh: " + message);
            }

            boolean isAjax = "XMLHttpRequest".equalsIgnoreCase(request.getHeader("X-Requested-With"));
            if (isAjax) {
                response.setContentType("application/json;charset=UTF-8");
                String json = "{\"success\": " + (!isError) + ", \"message\": \"" + message.replace("\"", "\\\"") + "\"}";
                response.getWriter().write(json);
                return;
            }

            if (isError) {
                request.getSession().setAttribute("flashError", message);
            } else {
                request.getSession().setAttribute("flashSuccess", message);
            }
            response.sendRedirect(request.getContextPath() + "/dashboard");

        } catch (Exception e) {
            e.printStackTrace();
            request.getSession().setAttribute("flashError", "Lỗi điều khiển: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/dashboard");
        }
    }
}
