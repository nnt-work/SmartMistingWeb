package controller;

import dao.ActivityLogDAO;
import dao.ControlCommandDAO;
import dao.MistingSettingDAO;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import model.AppUser;
import model.ControlCommand;
import model.MistingSetting;
import util.Json;

/**
 * Controller servlet for reading and configuring misting thresholds,
 * cycle timing, and operating modes.
 */
@WebServlet(name = "SettingServlet", urlPatterns = {"/admin/settings", "/settings"})
public class SettingServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        request.setAttribute("activeNav", "settings");
        request.getRequestDispatcher("/dashboard").forward(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            int deviceId = Integer.parseInt(
                    request.getParameter("device_id") == null ? "1" : request.getParameter("device_id")
            );
            MistingSettingDAO dao = new MistingSettingDAO();
            MistingSetting setting = dao.getSettingByDeviceId(deviceId);
            if (setting == null) {
                throw new IllegalArgumentException("Device settings not found");
            }

            if ("save_duration".equals(request.getParameter("action"))) {
                int sec = Integer.parseInt(request.getParameter("max_run_sec"));
                if (sec < 1 || sec > 600) {
                    throw new IllegalArgumentException("Manual pulse duration must be between 1 and 600 seconds");
                }
                dao.updateMaxRunSec(deviceId, sec);
                Json.send(response, 200, Json.map("status", "success", "max_run_sec", sec));
                return;
            }

            double humOn = Double.parseDouble(request.getParameter("humidity_on"));
            double humOff = Double.parseDouble(request.getParameter("humidity_off"));
            int duration = Integer.parseInt(request.getParameter("max_run_sec"));
            int cooldown = Integer.parseInt(request.getParameter("cooldown_sec"));
            String mode = request.getParameter("desired_mode");

            if (!Double.isFinite(humOn) || !Double.isFinite(humOff)
                    || humOn != Math.rint(humOn) || humOff != Math.rint(humOff)
                    || humOn < 1 || humOn >= humOff || humOff > 100
                    || duration < 1 || duration > 600 || cooldown < 0 || cooldown > 600
                    || (!"AUTO".equals(mode) && !"MANUAL".equals(mode))) {
                throw new IllegalArgumentException(
                        "Use integer RH bounds 1 <= on < off <= 100, pulse 1 to 600 seconds, cooldown 0 to 600"
                );
            }

            setting.setHumidityOn(humOn);
            setting.setHumidityOff(humOff);
            setting.setMaxRunSec(duration);
            setting.setCooldownSec(cooldown);
            setting.setDesiredMode(mode);

            if (!dao.updateSetting(setting)) {
                throw new IllegalArgumentException("Settings could not be updated in database");
            }

            AppUser user = (AppUser) request.getSession().getAttribute("user");
            ControlCommand cmd = new ControlCommand();
            cmd.setDeviceId(deviceId);
            cmd.setUserId(user.getUserId());
            cmd.setCommandType("SYNC_SETTING");
            cmd.setPayloadJson(Json.stringify(Json.map(
                    "on", (int) humOn,
                    "off", (int) humOff,
                    "mode", mode
            )));
            cmd.setStatus("PENDING");

            int commandId = new ControlCommandDAO().createCommand(cmd);

            new ActivityLogDAO().log(
                    "ADMIN",
                    deviceId,
                    user.getUserId(),
                    commandId,
                    "SETTING_UPDATE",
                    "Air RH " + humOn + " to " + humOff + "; AUTO continuous; manual pulse=" + duration + "s"
            );

            Json.send(response, 200, Json.map(
                    "status", "success",
                    "command_id", commandId,
                    "message", "Saved to database. Hardware sync pending; connect USB bridge."
            ));

        } catch (IllegalArgumentException e) {
            Json.send(response, 400, Json.map("status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            getServletContext().log("Settings update failed", e);
            Json.send(response, 503, Json.map("status", "error", "message", "Settings not saved. Check SQL Server."));
        }
    }
}
