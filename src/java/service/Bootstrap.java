package service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import model.ActivityLog;
import model.AppUser;
import model.ControlCommand;
import model.MistingSetting;
import model.Plant;
import model.SensorReading;
import util.Json;

/**
 * Service utility to construct the initial client-side state payload
 * for the Single-Page Application (SPA) dashboard view.
 */
public final class Bootstrap {

    private Bootstrap() {
    }

    /**
     * Serializes initial dashboard bootstrap state into a JSON string.
     *
     * @param request HttpServletRequest for session inspection
     * @param setting Current system misting settings
     * @param plants List of active plant profiles
     * @param users List of system users (for admin users)
     * @param cmds Recent control commands
     * @param readings Recent sensor telemetry readings
     * @param logs Recent system activity logs
     * @return Serialized JSON bootstrap payload
     */
    public static String create(HttpServletRequest request,
                                MistingSetting setting,
                                List<Plant> plants,
                                List<AppUser> users,
                                List<ControlCommand> cmds,
                                List<SensorReading> readings,
                                List<ActivityLog> logs) {

        AppUser user = (AppUser) request.getSession().getAttribute("user");
        Map<String, Object> map = Json.map(
                "currentUserId", user.getUserId(),
                "currentUserRole", user.getRoleCode(),
                "currentUserName", user.getFullName(),
                "systemMode", setting.getDesiredMode(),
                "activePlantId", plants.isEmpty() ? 0 : plants.get(0).getPlantId(),
                "setting", Json.map(
                        "humOn", setting.getHumidityOn(),
                        "humOff", setting.getHumidityOff(),
                        "maxRun", setting.getMaxRunSec(),
                        "cooldown", setting.getCooldownSec()
                )
        );

        List<Object> plantList = new ArrayList<>();
        for (Plant p : plants) {
            plantList.add(Json.map(
                    "id", p.getPlantId(),
                    "name", p.getPlantName(),
                    "sci", p.getSpecies(),
                    "min", p.getHumidityOn(),
                    "max", p.getHumidityOff(),
                    "burst", setting.getMaxRunSec(),
                    "notes", p.getNote()
            ));
        }

        List<Object> userList = new ArrayList<>();
        if (user.isAdmin()) {
            for (AppUser u : users) {
                userList.add(Json.map(
                        "id", u.getUserId(),
                        "username", u.getUsername(),
                        "fullName", u.getFullName(),
                        "email", u.getEmail(),
                        "role", u.getRoleCode(),
                        "isLocked", u.isIsLocked(),
                        "createdAt", u.getCreatedAt()
                ));
            }
        }

        List<Object> commandList = new ArrayList<>();
        for (ControlCommand c : cmds) {
            commandList.add(Json.map(
                    "time", c.getCreatedAt(),
                    "mode", "-",
                    "cmd", c.getCommandType(),
                    "actor", c.getUsername(),
                    "dur", "-",
                    "tank", "-",
                    "ack", c.getStatus()
            ));
        }

        List<Object> readingList = new ArrayList<>();
        for (SensorReading r : readings) {
            readingList.add(Json.map(
                    "time", r.getReceivedAt(),
                    "soil", r.getHumidityPct() == null ? "--" : r.getHumidityPct() + "%",
                    "tank", r.getWaterPercent() == null ? "--" : r.getWaterPercent() + "%",
                    "rain", r.getAirHumidity() == null ? "--" : r.getAirHumidity() + "%",
                    "status", r.isIsSample() ? "SAMPLE" : r.getLockReason()
            ));
        }

        List<Object> logList = new ArrayList<>();
        if (user.isAdmin()) {
            for (ActivityLog l : logs) {
                logList.add(Json.map(
                        "time", l.getOccurredAt(),
                        "action", l.getAction(),
                        "detail", l.getDetail(),
                        "user", l.getUsername(),
                        "ip", "-",
                        "sev", "INFO"
                ));
            }
        }

        map.put("plants", plantList);
        map.put("users", userList);
        map.put("history", Json.map(
                "pump", commandList,
                "sensor", readingList,
                "audit", logList
        ));

        return Json.stringify(map);
    }
}
