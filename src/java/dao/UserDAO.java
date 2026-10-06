package dao;

import model.AppUser;
import util.DBContext;
import util.PasswordUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class UserDAO {

    public AppUser login(String username, String rawPassword) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT user_id, username, password_hash, full_name, email, role_code, is_locked, is_deleted, created_at, updated_at "
                       + "FROM AppUser WHERE username = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setString(1, username);
            rs = ps.executeQuery();
            if (rs.next()) {
                String storedHash = rs.getString("password_hash");
                if (PasswordUtil.verify(rawPassword, storedHash)) {
                    AppUser user = mapResultSetToUser(rs);
                    return user;
                }
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public AppUser getUserById(int userId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT user_id, username, password_hash, full_name, email, role_code, is_locked, is_deleted, created_at, updated_at "
                       + "FROM AppUser WHERE user_id = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, userId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToUser(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public AppUser getUserByUsername(String username) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT user_id, username, password_hash, full_name, email, role_code, is_locked, is_deleted, created_at, updated_at "
                       + "FROM AppUser WHERE username = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setString(1, username);
            rs = ps.executeQuery();
            if (rs.next()) {
                return mapResultSetToUser(rs);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return null;
    }

    public List<AppUser> getAllUsers(String keyword, String roleFilter) throws SQLException, ClassNotFoundException {
        List<AppUser> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            StringBuilder sql = new StringBuilder("SELECT user_id, username, password_hash, full_name, email, role_code, is_locked, is_deleted, created_at, updated_at "
                                                + "FROM AppUser WHERE is_deleted = 0 ");
            if (keyword != null && !keyword.trim().isEmpty()) {
                sql.append("AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?) ");
            }
            if (roleFilter != null && !roleFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(roleFilter)) {
                sql.append("AND role_code = ? ");
            }
            sql.append("ORDER BY user_id ASC");

            ps = conn.prepareStatement(sql.toString());
            int idx = 1;
            if (keyword != null && !keyword.trim().isEmpty()) {
                String searchPattern = "%" + keyword.trim() + "%";
                ps.setString(idx++, searchPattern);
                ps.setString(idx++, searchPattern);
                ps.setString(idx++, searchPattern);
            }
            if (roleFilter != null && !roleFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(roleFilter)) {
                ps.setString(idx++, roleFilter.trim().toUpperCase());
            }

            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToUser(rs));
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public boolean createUser(AppUser user, String rawPassword) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "INSERT INTO AppUser (username, password_hash, full_name, email, role_code, is_locked, is_deleted, created_at, updated_at) "
                       + "VALUES (?, ?, ?, ?, ?, 0, 0, SYSDATETIME(), SYSDATETIME())";
            ps = conn.prepareStatement(sql);
            ps.setString(1, user.getUsername());
            ps.setString(2, PasswordUtil.hashPassword(rawPassword));
            ps.setString(3, user.getFullName());
            ps.setString(4, user.getEmail());
            ps.setString(5, user.getRoleCode().toUpperCase());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updateUser(AppUser user) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE AppUser SET full_name = ?, email = ?, role_code = ?, updated_at = SYSDATETIME() "
                       + "WHERE user_id = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setString(1, user.getFullName());
            ps.setString(2, user.getEmail());
            ps.setString(3, user.getRoleCode().toUpperCase());
            ps.setInt(4, user.getUserId());
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updateProfile(int userId, String fullName, String email) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE AppUser SET full_name = ?, email = ?, updated_at = SYSDATETIME() "
                       + "WHERE user_id = ? AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            ps.setString(1, fullName);
            ps.setString(2, email);
            ps.setInt(3, userId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean updatePassword(int userId, String newRawPassword) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE AppUser SET password_hash = ?, updated_at = SYSDATETIME() WHERE user_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setString(1, PasswordUtil.hashPassword(newRawPassword));
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean setLockStatus(int userId, boolean isLocked) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE AppUser SET is_locked = ?, updated_at = SYSDATETIME() WHERE user_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setBoolean(1, isLocked);
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public boolean deleteUser(int userId) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE AppUser SET is_deleted = 1, updated_at = SYSDATETIME() WHERE user_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setInt(1, userId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public int countActiveAdmins() throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT COUNT(*) FROM AppUser WHERE role_code = 'ADMIN' AND is_locked = 0 AND is_deleted = 0";
            ps = conn.prepareStatement(sql);
            rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return 0;
    }

    private AppUser mapResultSetToUser(ResultSet rs) throws SQLException {
        AppUser u = new AppUser();
        u.setUserId(rs.getInt("user_id"));
        u.setUsername(rs.getString("username"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setFullName(rs.getString("full_name"));
        u.setEmail(rs.getString("email"));
        u.setRoleCode(rs.getString("role_code"));
        u.setIsLocked(rs.getBoolean("is_locked"));
        u.setIsDeleted(rs.getBoolean("is_deleted"));
        u.setCreatedAt(rs.getTimestamp("created_at"));
        u.setUpdatedAt(rs.getTimestamp("updated_at"));
        return u;
    }

    public void toggleLock(int userId, boolean equals) {
        throw new UnsupportedOperationException("Not supported yet."); // Generated from nbfs://nbhost/SystemFileSystem/Templates/Classes/Code/GeneratedMethodBody
    }

    public List<AppUser> getAllUsers() {
        throw new UnsupportedOperationException("Not supported yet."); // Generated from nbfs://nbhost/SystemFileSystem/Templates/Classes/Code/GeneratedMethodBody
    }

    public void updateRole(int userId, String newRole) {
        throw new UnsupportedOperationException("Not supported yet."); // Generated from nbfs://nbhost/SystemFileSystem/Templates/Classes/Code/GeneratedMethodBody
    }
}
