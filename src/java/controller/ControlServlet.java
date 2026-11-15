package controller;

import dao.ActivityLogDAO;
import dao.ControlCommandDAO;
import dao.DeviceDAO;
import dao.MistingSettingDAO;
import dao.SensorReadingDAO;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import model.AppUser;
import model.ControlCommand;
import model.Device;
import service.HardwarePolicy;
import util.Json;

/**
 * Controller servlet for queuing hardware actuation commands
 * (START pump, STOP pump, SET_MODE).
 * Enforces server-side safety interlocks via HardwarePolicy before queuing.
 */
@WebServlet(name = "ControlServlet", urlPatterns = {"/control"})
public class ControlServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        AppUser user = (AppUser) request.getSession().getAttribute("user");
        try {
            int deviceId = Integer.parseInt(request.getParameter("device_id") == null ? "1" : request.getParameter("device_id"));
            Device device = new DeviceDAO().getDeviceById(deviceId);
            if (device == null || !device.isIsActive()) {
                throw new IllegalArgumentException("Unknown or inactive device");
            }

            String action = request.getParameter("action");
            String mode = request.getParameter("mode");
            String type;
            String payload;

            if ("start_pump".equals(action)) {
                String blockReason = HardwarePolicy.startBlock(
                        new SensorReadingDAO().getLatestReading(deviceId),
                        System.currentTimeMillis()
                );
                if (blockReason != null) {
                    throw new IllegalArgumentException(blockReason);
                }
                type = "START";
                int durationSec = request.getParameter("duration_sec") == null ? 0 : Integer.parseInt(request.getParameter("duration_sec"));
                if (durationSec < 0 || durationSec > 600) {
                    throw new IllegalArgumentException("Duration must be between 0 and 600 seconds");
                }
                payload = Json.stringify(Json.map("duration_sec", durationSec));
            } else if ("stop_pump".equals(action)) {
                type = "STOP";
                payload = "{}";
            } else if ("set_mode".equals(action) && ("AUTO".equals(mode) || "MANUAL".equals(mode))) {
                type = "SET_MODE";
                payload = Json.stringify(Json.map("mode", mode));
            } else {
                throw new IllegalArgumentException("Invalid action or control mode");
            }

            ControlCommand cmd = new ControlCommand();
            cmd.setDeviceId(deviceId);
            cmd.setUserId(user.getUserId());
            cmd.setCommandType(type);
            cmd.setPayloadJson(payload);
            cmd.setStatus("PENDING");

            int commandId = new ControlCommandDAO().createCommand(cmd);

            if ("SET_MODE".equals(type)) {
                new MistingSettingDAO().updateDesiredMode(deviceId, mode);
            }

            new ActivityLogDAO().log(
                    "MISTING",
                    deviceId,
                    user.getUserId(),
                    commandId,
                    type,
                    "Command queued by " + user.getUsername() + "; awaiting Arduino telemetry confirmation"
            );

            Json.send(response, 202, Json.map(
                    "success", true,
                    "command_id", commandId,
                    "status", "PENDING",
                    "message", "Command queued; awaiting physical confirmation"
            ));

        } catch (IllegalArgumentException e) {
            Json.send(response, 409, Json.map("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            getServletContext().log("Command execution failed", e);
            Json.send(response, 503, Json.map("success", false, "message", "Command not saved. Check SQL Server."));
        }
    }
}
