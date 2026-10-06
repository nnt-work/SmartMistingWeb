package dao;

import model.ActivityLog;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ActivityLogDAO {

    public boolean log(String logType, Integer deviceId, Integer userId, Integer commandId, String action, String detail) {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "INSERT INTO ActivityLog (device_id, user_id, command_id, event_id, log_type, action, detail, occurred_at, is_sample) "
                       + "VALUES (?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), 0)";
            ps = conn.prepareStatement(sql);
            if (deviceId != null && deviceId > 0) ps.setInt(1, deviceId); else ps.setNull(1, java.sql.Types.INTEGER);
            if (userId != null && userId > 0) ps.setInt(2, userId); else ps.setNull(2, java.sql.Types.INTEGER);
            if (commandId != null && commandId > 0) ps.setInt(3, commandId); else ps.setNull(3, java.sql.Types.INTEGER);
            String eventId = "EVT-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 1000);
            ps.setString(4, eventId);
            ps.setString(5, logType.toUpperCase());
            ps.setString(6, action);
            ps.setString(7, detail);
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public List<ActivityLog> getLogs(String logType, String keyword, int limit) throws SQLException, ClassNotFoundException {
        List<ActivityLog> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            StringBuilder sql = new StringBuilder("SELECT TOP " + limit + " a.log_id, a.device_id, a.user_id, a.command_id, "
                                                + "a.event_id, a.log_type, a.action, a.detail, a.occurred_at, a.is_sample, "
                                                + "u.username, d.device_name "
                                                + "FROM ActivityLog a "
                                                + "LEFT JOIN AppUser u ON a.user_id = u.user_id "
                                                + "LEFT JOIN Device d ON a.device_id = d.device_id "
                                                + "WHERE 1=1 ");
            if (logType != null && !logType.trim().isEmpty() && !"ALL".equalsIgnoreCase(logType)) {
                sql.append("AND a.log_type = ? ");
            }
            if (keyword != null && !keyword.trim().isEmpty()) {
                sql.append("AND (a.action LIKE ? OR a.detail LIKE ? OR u.username LIKE ?) ");
            }
            sql.append("ORDER BY a.log_id DESC");

            ps = conn.prepareStatement(sql.toString());
            int idx = 1;
            if (logType != null && !logType.trim().isEmpty() && !"ALL".equalsIgnoreCase(logType)) {
                ps.setString(idx++, logType.trim().toUpperCase());
            }
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim() + "%";
                ps.setString(idx++, pattern);
                ps.setString(idx++, pattern);
                ps.setString(idx++, pattern);
            }

            rs = ps.executeQuery();
            while (rs.next()) {
                ActivityLog l = new ActivityLog();
                l.setLogId(rs.getLong("log_id"));
                int did = rs.getInt("device_id");
                if (!rs.wasNull()) l.setDeviceId(did);
                int uid = rs.getInt("user_id");
                if (!rs.wasNull()) l.setUserId(uid);
                int cid = rs.getInt("command_id");
                if (!rs.wasNull()) l.setCommandId(cid);
                l.setEventId(rs.getString("event_id"));
                l.setLogType(rs.getString("log_type"));
                l.setAction(rs.getString("action"));
                l.setDetail(rs.getString("detail"));
                l.setOccurredAt(rs.getTimestamp("occurred_at"));
                l.setIsSample(rs.getBoolean("is_sample"));
                l.setUsername(rs.getString("username"));
                l.setDeviceName(rs.getString("device_name"));
                list.add(l);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }
}
