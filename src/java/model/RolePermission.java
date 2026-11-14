package model;

public class RolePermission {
    private int permId;
    private String moduleKey;
    private String moduleName;
    private String operationalScope;
    private boolean adminAllowed;
    private boolean staffAllowed;
    private boolean viewerAllowed;

    public RolePermission() {
    }

    public RolePermission(int permId, String moduleKey, String moduleName, String operationalScope,
                          boolean adminAllowed, boolean staffAllowed, boolean viewerAllowed) {
        this.permId = permId;
        this.moduleKey = moduleKey;
        this.moduleName = moduleName;
        this.operationalScope = operationalScope;
        this.adminAllowed = adminAllowed;
        this.staffAllowed = staffAllowed;
        this.viewerAllowed = viewerAllowed;
    }

    public int getPermId() {
        return permId;
    }

    public void setPermId(int permId) {
        this.permId = permId;
    }

    public String getModuleKey() {
        return moduleKey;
    }

    public void setModuleKey(String moduleKey) {
        this.moduleKey = moduleKey;
    }

    public String getModuleName() {
        return moduleName;
    }

    public void setModuleName(String moduleName) {
        this.moduleName = moduleName;
    }

    public String getOperationalScope() {
        return operationalScope;
    }

    public void setOperationalScope(String operationalScope) {
        this.operationalScope = operationalScope;
    }

    public boolean isAdminAllowed() {
        return adminAllowed;
    }

    public void setAdminAllowed(boolean adminAllowed) {
        this.adminAllowed = adminAllowed;
    }

    public boolean isStaffAllowed() {
        return staffAllowed;
    }

    public void setStaffAllowed(boolean staffAllowed) {
        this.staffAllowed = staffAllowed;
    }

    public boolean isViewerAllowed() {
        return viewerAllowed;
    }

    public void setViewerAllowed(boolean viewerAllowed) {
        this.viewerAllowed = viewerAllowed;
    }
}
