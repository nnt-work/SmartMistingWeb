package model;

import java.sql.Timestamp;

public class AppUser {
    private int userId;
    private String username;
    private String passwordHash;
    private String fullName;
    private String email;
    private String roleCode;
    private boolean isLocked;
    private boolean isDeleted;
    private String statusText;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public AppUser() {
        this.statusText = "Active";
    }

    public AppUser(int userId, String username, String passwordHash, String fullName, String email, String roleCode, boolean isLocked, boolean isDeleted, Timestamp createdAt, Timestamp updatedAt) {
        this.userId = userId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.email = email;
        this.roleCode = roleCode;
        this.isLocked = isLocked;
        this.isDeleted = isDeleted;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRoleCode() {
        return roleCode;
    }

    public void setRoleCode(String roleCode) {
        this.roleCode = roleCode;
    }

    public boolean isIsLocked() {
        return isLocked;
    }

    public void setIsLocked(boolean isLocked) {
        this.isLocked = isLocked;
    }

    public boolean isIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(roleCode);
    }

    public boolean isStaff() {
        return "STAFF".equalsIgnoreCase(roleCode);
    }

    public boolean isViewer() {
        return "VIEWER".equalsIgnoreCase(roleCode);
    }

    public boolean isLocked() {
        return isLocked;
    }

    public void setLocked(boolean aBoolean) {
        this.isLocked = aBoolean;
    }

    public void setDeleted(boolean aBoolean) {
        this.isDeleted = aBoolean;
    }

    public String getStatusText() {
        return (statusText != null && !statusText.trim().isEmpty()) ? statusText : "Active";
    }

    public void setStatusText(String statusText) {
        this.statusText = statusText;
    }
}
