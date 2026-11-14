package dao;

import model.Plant;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PlantDAO {

    public List<Plant> getPlants(String keyword, int page, int pageSize) throws SQLException, ClassNotFoundException {
        List<Plant> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            StringBuilder sql = new StringBuilder("SELECT p.plant_id, p.plant_name, p.species, p.planted_date, p.note, p.humidity_on, p.humidity_off, p.is_deleted, p.created_by, p.created_at, u.full_name AS creator_name "
                                                + "FROM Plant p LEFT JOIN AppUser u ON p.created_by = u.user_id "
                                                + "WHERE p.is_deleted = 0 ");
            if (keyword != null && !keyword.trim().isEmpty()) {
                sql.append("AND (p.plant_name LIKE ? OR p.species LIKE ? OR p.note LIKE ?) ");
            }
            sql.append("ORDER BY p.plant_id DESC ");
            sql.append("OFFSET ? ROWS FETCH NEXT ? ROWS ONLY");

            ps = conn.prepareStatement(sql.toString());
            int idx = 1;
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim() + "%";
                ps.setString(idx++, pattern);
                ps.setString(idx++, pattern);
                ps.setString(idx++, pattern);
            }
            int offset = (page - 1) * pageSize;
            ps.setInt(idx++, offset);
            ps.setInt(idx++, pageSize);

            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToPlant(rs));
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public int countPlants(String keyword) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM Plant WHERE is_deleted = 0 ");
            if (keyword != null && !keyword.trim().isEmpty()) {
                sql.append("AND (plant_name LIKE ? OR species LIKE ? OR note LIKE ?) ");
            }
            ps = conn.prepareStatement(sql.toString());
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim() + "%";
                ps.setString(1, pattern);
                ps.setString(2, pattern);
                ps.setString(3, pattern);
            }
            rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return 0;
    }

    public Plant getPlantById(int plantId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT p.plant_id, p.plant_name, p.species, p.planted_date, p.note, p.humidity_on, p.humidity_off, p.is_deleted, p.created_by, p.created_at, u.full_name AS creator_name "
                       + "FROM Plant p LEFT JOIN AppUser u ON p.created_by = u.user_id "
                       + "WHERE p.plant_id = ? AND p.is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, plantId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToPlant(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public boolean addPlant(Plant plant) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "INSERT INTO Plant (plant_name, species, planted_date, note, humidity_on, humidity_off, is_deleted, created_by, created_at) "
                       + "VALUES (?, ?, ?, ?, ?, ?, 0, ?, SYSDATETIME())";
            ps = conn.prepareStatement(sql);
            ps.setString(1, plant.getPlantName());
            ps.setString(2, plant.getSpecies());
            ps.setDate(3, plant.getPlantedDate());
            ps.setString(4, plant.getNote());
            if (plant.getHumidityOn() != null) ps.setDouble(5, plant.getHumidityOn()); else ps.setNull(5, java.sql.Types.DECIMAL);
            if (plant.getHumidityOff() != null) ps.setDouble(6, plant.getHumidityOff()); else ps.setNull(6, java.sql.Types.DECIMAL);
            if (plant.getCreatedBy() != null) {
                ps.setInt(7, plant.getCreatedBy());
            } else {
                ps.setNull(7, java.sql.Types.INTEGER);
            }
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updatePlant(Plant plant) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE Plant SET plant_name = ?, species = ?, planted_date = ?, note = ?, humidity_on = ?, humidity_off = ? "
                       + "WHERE plant_id = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setString(1, plant.getPlantName());
            ps.setString(2, plant.getSpecies());
            ps.setDate(3, plant.getPlantedDate());
            ps.setString(4, plant.getNote());
            if (plant.getHumidityOn() != null) ps.setDouble(5, plant.getHumidityOn()); else ps.setNull(5, java.sql.Types.DECIMAL);
            if (plant.getHumidityOff() != null) ps.setDouble(6, plant.getHumidityOff()); else ps.setNull(6, java.sql.Types.DECIMAL);
            ps.setInt(7, plant.getPlantId());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean deletePlant(int plantId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE Plant SET is_deleted = 1 WHERE plant_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, plantId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    private Plant mapResultSetToPlant(ResultSet rs) throws SQLException {
        Plant p = new Plant();
        p.setPlantId(rs.getInt("plant_id"));
        p.setPlantName(rs.getString("plant_name"));
        p.setSpecies(rs.getString("species"));
        p.setPlantedDate(rs.getDate("planted_date"));
        p.setNote(rs.getString("note"));
        double hOn = rs.getDouble("humidity_on");
        if (!rs.wasNull()) p.setHumidityOn(hOn);
        double hOff = rs.getDouble("humidity_off");
        if (!rs.wasNull()) p.setHumidityOff(hOff);
        p.setIsDeleted(rs.getBoolean("is_deleted"));
        int createdBy = rs.getInt("created_by");
        if (!rs.wasNull()) {
            p.setCreatedBy(createdBy);
        }
        p.setCreatedAt(rs.getTimestamp("created_at"));
        p.setCreatorName(rs.getString("creator_name"));
        return p;
    }
}
