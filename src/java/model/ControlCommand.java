package model;
import java.sql.Timestamp;

public class ControlCommand {
    private int commandId;
    private int deviceId;
    private int userId;
    private String commandType;
    private String payloadJson;
    private String status;
    private Timestamp createdAt;
    private Timestamp expiresAt;
    private Timestamp ackAt;
    
    // Auxiliary display properties
    private String username;

    public ControlCommand() {}

    public int getCommandId() { return commandId; }
    public void setCommandId(int commandId) { this.commandId = commandId; }

    public int getDeviceId() { return deviceId; }
    public void setDeviceId(int deviceId) { this.deviceId = deviceId; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getCommandType() { return commandType; }
    public void setCommandType(String commandType) { this.commandType = commandType; }

    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Timestamp expiresAt) { this.expiresAt = expiresAt; }

    public Timestamp getAckAt() { return ackAt; }
    public void setAckAt(Timestamp ackAt) { this.ackAt = ackAt; }

    private String deviceName;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }

    public Timestamp getRequestedAt() { return createdAt; }
    public String getRequestedMode() { return "MANUAL"; }
    public String getRequestedBy() { return username != null ? username : "Operator"; }
}
