package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import model.RolePermission;
import util.DBContext;

/**
 * Data Access Object for Role-Based Access Control (RBAC) permissions.
 * Enforces server-side authorization matrices across system modules.
 */
public class RolePermissionDAO {

    /**
     * Retrieves aggregated module access permissions across all user roles.
     *
     * @return List of RolePermission matrix rows
     */
    public List<RolePermission> getAllPermissions() {
        List<RolePermission> list = new ArrayList<>();
        String sql = "SELECT module_code, "
                   + "MAX(CASE WHEN role_code = 'ADMIN' THEN CONVERT(int, can_access) ELSE 0 END) AS admin_access, "
                   + "MAX(CASE WHEN role_code = 'STAFF' THEN CONVERT(int, can_access) ELSE 0 END) AS staff_access, "
                   + "MAX(CASE WHEN role_code = 'VIEWER' THEN CONVERT(int, can_access) ELSE 0 END) AS viewer_access "
                   + "FROM RolePermission "
                   + "GROUP BY module_code "
                   + "ORDER BY module_code";

        try (Connection conn = DBContext.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            int index = 0;
            while (rs.next()) {
                RolePermission perm = new RolePermission();
                perm.setPermId(++index);
                String moduleCode = rs.getString(1);
                perm.setModuleKey(moduleCode);
                perm.setModuleName(moduleCode != null ? moduleCode.replace('_', ' ') : "");
                perm.setOperationalScope("Server enforced access");
                perm.setAdminAllowed(rs.getBoolean(2));
                perm.setStaffAllowed(rs.getBoolean(3));
                perm.setViewerAllowed(rs.getBoolean(4));
                list.add(perm);
            }
        } catch (Exception e) {
            System.err.println("Cannot load role permissions: " + e.getMessage());
        }
        return list;
    }

    /**
     * Updates an access permission for a given module and role.
     * ADMIN permissions cannot be revoked.
     *
     * @param moduleKey The module identifier
     * @param roleCode The target role (STAFF or VIEWER)
     * @param allowed Whether access is granted
     * @return true if updated successfully
     */
    public boolean updatePermission(String moduleKey, String roleCode, boolean allowed) {
        if ("ADMIN".equals(roleCode)) {
            return false;
        }
        if (!"STAFF".equals(roleCode) && !"VIEWER".equals(roleCode)) {
            return false;
        }

        String sql = "UPDATE RolePermission SET can_access = ? WHERE module_code = ? AND role_code = ?";
        try (Connection conn = DBContext.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setBoolean(1, allowed);
            ps.setString(2, moduleKey);
            ps.setString(3, roleCode);
            return ps.executeUpdate() == 1;
        } catch (Exception e) {
            System.err.println("Error updating role permission: " + e.getMessage());
            return false;
        }
    }

    /**
     * Checks if a specified role is permitted to access a given module.
     * ADMIN always has full access.
     *
     * @param moduleKey The module identifier
     * @param roleCode The user's role
     * @return true if access is allowed
     */
    public boolean allowed(String moduleKey, String roleCode) {
        if ("ADMIN".equals(roleCode)) {
            return true;
        }

        String sql = "SELECT can_access FROM RolePermission WHERE role_code = ? AND module_code = ?";
        try (Connection conn = DBContext.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, roleCode);
            ps.setString(2, moduleKey);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        } catch (Exception e) {
            System.err.println("Error verifying permission: " + e.getMessage());
            return false;
        }
    }
}
