package dao;

import model.Device;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import model.MistingSetting;

public class DeviceDAO {

    public List<Device> getAllDevices() throws SQLException, ClassNotFoundException {
        List<Device> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT device_id, device_code, device_name, api_key_hash, last_seen, is_active FROM Device ORDER BY device_id ASC";
            ps = conn.prepareStatement(sql);
            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToDevice(rs));
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public Device getDeviceById(int deviceId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT device_id, device_code, device_name, api_key_hash, last_seen, is_active FROM Device WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, deviceId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToDevice(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public Device getDeviceByCode(String code) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT device_id, device_code, device_name, api_key_hash, last_seen, is_active FROM Device WHERE device_code = ?";
            ps = conn.prepareStatement(sql);
            ps.setString(1, code);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToDevice(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public boolean updateDevice(Device d) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE Device SET device_name = ?, is_active = ? WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setString(1, d.getDeviceName());
            ps.setBoolean(2, d.isIsActive());
            ps.setInt(3, d.getDeviceId());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updateLastSeen(int deviceId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE Device SET last_seen = SYSDATETIME() WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, deviceId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean toggleActive(int deviceId, boolean isActive) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE Device SET is_active = ? WHERE device_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setBoolean(1, isActive);
            ps.setInt(2, deviceId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    private Device mapResultSetToDevice(ResultSet rs) throws SQLException {
        Device d = new Device();
        d.setDeviceId(rs.getInt("device_id"));
        d.setDeviceCode(rs.getString("device_code"));
        d.setDeviceName(rs.getString("device_name"));
        d.setApiKeyHash(rs.getString("api_key_hash"));
        d.setLastSeen(rs.getTimestamp("last_seen"));
        d.setIsActive(rs.getBoolean("is_active"));
        return d;
    }

    public MistingSetting getSetting(int deviceId) {
        throw new UnsupportedOperationException("Not supported yet."); // Generated from nbfs://nbhost/SystemFileSystem/Templates/Classes/Code/GeneratedMethodBody
    }
}
