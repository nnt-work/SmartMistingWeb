package dao;

import model.MistingSetting;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class MistingSettingDAO {

    public MistingSetting getSettingByDeviceId(int deviceId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT device_id, humidity_on, humidity_off, max_run_sec, cooldown_sec, desired_mode, version, updated_at "
                       + "FROM MistingSetting WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, deviceId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToSetting(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public boolean updateSetting(MistingSetting s) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE MistingSetting SET humidity_on = ?, humidity_off = ?, max_run_sec = ?, cooldown_sec = ?, desired_mode = ?, version = version + 1, updated_at = SYSDATETIME() "
                       + "WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setDouble(1, s.getHumidityOn());
            ps.setDouble(2, s.getHumidityOff());
            ps.setInt(3, s.getMaxRunSec());
            ps.setInt(4, s.getCooldownSec());
            ps.setString(5, s.getDesiredMode().toUpperCase());
            ps.setInt(6, s.getDeviceId());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updateDesiredMode(int deviceId, String mode) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE MistingSetting SET desired_mode = ?, version = version + 1, updated_at = SYSDATETIME() WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setString(1, mode.toUpperCase());
            ps.setInt(2, deviceId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    private MistingSetting mapResultSetToSetting(ResultSet rs) throws SQLException {
        MistingSetting s = new MistingSetting();
        s.setDeviceId(rs.getInt("device_id"));
        s.setHumidityOn(rs.getDouble("humidity_on"));
        s.setHumidityOff(rs.getDouble("humidity_off"));
        s.setMaxRunSec(rs.getInt("max_run_sec"));
        s.setCooldownSec(rs.getInt("cooldown_sec"));
        s.setDesiredMode(rs.getString("desired_mode"));
        s.setVersion(rs.getInt("version"));
        s.setUpdatedAt(rs.getTimestamp("updated_at"));
        return s;
    }
}
