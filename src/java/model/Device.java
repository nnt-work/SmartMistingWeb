package model;

import java.sql.Timestamp;

public class Device {
    private int deviceId;
    private String deviceCode;
    private String deviceName;
    private String apiKeyHash;
    private Timestamp lastSeen;
    private boolean isActive;

    public Device() {
    }

    public Device(int deviceId, String deviceCode, String deviceName, String apiKeyHash, Timestamp lastSeen, boolean isActive) {
        this.deviceId = deviceId;
        this.deviceCode = deviceCode;
        this.deviceName = deviceName;
        this.apiKeyHash = apiKeyHash;
        this.lastSeen = lastSeen;
        this.isActive = isActive;
    }

    public int getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(int deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceCode() {
        return deviceCode;
    }

    public void setDeviceCode(String deviceCode) {
        this.deviceCode = deviceCode;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public String getApiKeyHash() {
        return apiKeyHash;
    }

    public void setApiKeyHash(String apiKeyHash) {
        this.apiKeyHash = apiKeyHash;
    }

    public Timestamp getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(Timestamp lastSeen) {
        this.lastSeen = lastSeen;
    }

    public boolean isIsActive() {
        return isActive;
    }

    public void setIsActive(boolean isActive) {
        this.isActive = isActive;
    }

    public boolean isOnline() {
        if (lastSeen == null) return false;
        long diff = System.currentTimeMillis() - lastSeen.getTime();
        return diff < (3 * 60 * 1000); // 3 minutes threshold
    }
}
