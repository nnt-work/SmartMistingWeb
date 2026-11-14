package dao;

import model.SensorReading;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SensorReadingDAO {

    private static final String SELECT_COLS =
        "r.reading_id, r.device_id, r.packet_id, r.temperature_c, r.humidity_pct, "
        + "r.water_ok, r.sensor_ok, r.reported_mode, r.pump_on, r.applied_version, "
        + "r.measured_at, r.received_at, r.is_sample, r.is_raining, "
        + "r.air_temperature, r.air_humidity, r.dht_ok, r.heat_stress, r.water_pct, r.lock_reason, d.device_name";

    public SensorReading getLatestReading(int deviceId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT TOP 1 " + SELECT_COLS
                       + " FROM SensorReading r LEFT JOIN Device d ON r.device_id = d.device_id"
                       + " WHERE r.device_id = ? ORDER BY r.reading_id DESC";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, deviceId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToReading(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public List<SensorReading> getRecentReadings(int deviceId, int limit) throws SQLException, ClassNotFoundException {
        List<SensorReading> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT TOP " + limit + " " + SELECT_COLS
                       + " FROM SensorReading r LEFT JOIN Device d ON r.device_id = d.device_id"
                       + (deviceId > 0 ? " WHERE r.device_id = ?" : "")
                       + " ORDER BY r.reading_id DESC";
            ps = conn.prepareStatement(sql);
            if (deviceId > 0) ps.setInt(1, deviceId);
            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToReading(rs));
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public List<SensorReading> getReadingsByDateRange(int deviceId, String fromDate, String toDate, int limit) throws SQLException, ClassNotFoundException {
        List<SensorReading> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            StringBuilder sql = new StringBuilder(
                "SELECT TOP " + (limit > 0 ? limit : 100) + " " + SELECT_COLS
                + " FROM SensorReading r LEFT JOIN Device d ON r.device_id = d.device_id WHERE 1=1"
            );
            if (deviceId > 0)                               sql.append(" AND r.device_id = ?");
            if (fromDate != null && !fromDate.trim().isEmpty()) sql.append(" AND r.received_at >= ?");
            if (toDate != null   && !toDate.trim().isEmpty())   sql.append(" AND r.received_at <= ?");
            sql.append(" ORDER BY r.reading_id DESC");

            ps = conn.prepareStatement(sql.toString());
            int idx = 1;
            if (deviceId > 0)                               ps.setInt(idx++, deviceId);
            if (fromDate != null && !fromDate.trim().isEmpty()) ps.setString(idx++, fromDate.trim() + " 00:00:00");
            if (toDate != null   && !toDate.trim().isEmpty())   ps.setString(idx++, toDate.trim()   + " 23:59:59");

            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToReading(rs));
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public boolean addReading(SensorReading r) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "INSERT INTO SensorReading "
                       + "(device_id, packet_id, temperature_c, humidity_pct, water_ok, sensor_ok, "
                       + "reported_mode, pump_on, applied_version, measured_at, received_at, "
                       + "is_sample, is_raining, air_temperature, air_humidity, dht_ok, heat_stress, water_pct, lock_reason) "
                       + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME(), ?, ?, ?, ?, ?, ?, ?, ?)";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, r.getDeviceId());
            ps.setString(2, r.getPacketId() != null ? r.getPacketId() : "PKT-" + System.currentTimeMillis());
            if (r.getTemperatureC()   != null) ps.setDouble(3,  r.getTemperatureC());   else ps.setNull(3,  java.sql.Types.DOUBLE);
            if (r.getHumidityPct()    != null) ps.setDouble(4,  r.getHumidityPct());    else ps.setNull(4,  java.sql.Types.DOUBLE);
            if (r.getWaterOk()        != null) ps.setBoolean(5, r.getWaterOk());        else ps.setNull(5,  java.sql.Types.BOOLEAN);
            ps.setBoolean(6, r.isSensorOk());
            ps.setString(7, r.getReportedMode());
            ps.setBoolean(8, r.isPumpOn());
            if (r.getAppliedVersion() != null) ps.setInt(9, r.getAppliedVersion());     else ps.setNull(9,  java.sql.Types.INTEGER);
            ps.setBoolean(10, r.isIsSample());
            if (r.getIsRaining()      != null) ps.setBoolean(11, r.getIsRaining());     else ps.setNull(11, java.sql.Types.BOOLEAN);

            if (r.getAirTemperature() != null) ps.setDouble(12, r.getAirTemperature()); else ps.setNull(12, java.sql.Types.DOUBLE);
            if (r.getAirHumidity()    != null) ps.setDouble(13, r.getAirHumidity());    else ps.setNull(13, java.sql.Types.DOUBLE);
            ps.setBoolean(14, Boolean.TRUE.equals(r.getDhtOk()));
            ps.setBoolean(15, false);
            if(r.getWaterPercent()!=null)ps.setDouble(16,r.getWaterPercent());else ps.setNull(16,java.sql.Types.DOUBLE);
            ps.setString(17,r.getLockReason());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    private SensorReading mapResultSetToReading(ResultSet rs) throws SQLException {
        SensorReading r = new SensorReading();
        r.setReadingId(rs.getLong("reading_id"));
        r.setDeviceId(rs.getInt("device_id"));
        r.setPacketId(rs.getString("packet_id"));

        double temp = rs.getDouble("temperature_c");
        if (!rs.wasNull()) r.setTemperatureC(temp);

        double hum = rs.getDouble("humidity_pct");
        if (!rs.wasNull()) r.setHumidityPct(hum);

        boolean water = rs.getBoolean("water_ok");
        if (!rs.wasNull()) r.setWaterOk(water);

        r.setSensorOk(rs.getBoolean("sensor_ok"));
        r.setReportedMode(rs.getString("reported_mode"));
        r.setPumpOn(rs.getBoolean("pump_on"));

        int ver = rs.getInt("applied_version");
        if (!rs.wasNull()) r.setAppliedVersion(ver);

        r.setMeasuredAt(rs.getTimestamp("measured_at"));
        r.setReceivedAt(rs.getTimestamp("received_at"));
        r.setIsSample(rs.getBoolean("is_sample"));

        boolean raining = rs.getBoolean("is_raining");
        if (!rs.wasNull()) r.setIsRaining(raining);

        try {
            double airTemp = rs.getDouble("air_temperature");
            if (!rs.wasNull()) r.setAirTemperature(airTemp);
            double airHum = rs.getDouble("air_humidity");
            if (!rs.wasNull()) r.setAirHumidity(airHum);
        } catch (java.sql.SQLException ignored) {

        }

        r.setDhtOk(rs.getBoolean("dht_ok"));
        r.setHeatStress(false);
        double wp=rs.getDouble("water_pct");if(!rs.wasNull())r.setWaterPercent(wp);
        r.setLockReason(rs.getString("lock_reason"));
        r.setDeviceName(rs.getString("device_name"));
        return r;
    }

    public int deleteSampleReadings() {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "DELETE FROM SensorReading WHERE is_sample = 1";
            ps = conn.prepareStatement(sql);
            return ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public int clearAllReadings() {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "DELETE FROM SensorReading";
            ps = conn.prepareStatement(sql);
            return ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }
}
