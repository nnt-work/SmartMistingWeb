package model;

import java.sql.Timestamp;

public class ActivityLog {
    private long logId;
    private Integer deviceId;
    private String deviceName;
    private Integer userId;
    private String username;
    private Integer commandId;
    private String eventId;
    private String logType; // 'MISTING', 'ADMIN'
    private String action;
    private String detail;
    private Timestamp occurredAt;
    private boolean isSample;

    public ActivityLog() {
    }

    public ActivityLog(long logId, Integer deviceId, Integer userId, Integer commandId, String eventId, String logType, String action, String detail, Timestamp occurredAt, boolean isSample) {
        this.logId = logId;
        this.deviceId = deviceId;
        this.userId = userId;
        this.commandId = commandId;
        this.eventId = eventId;
        this.logType = logType;
        this.action = action;
        this.detail = detail;
        this.occurredAt = occurredAt;
        this.isSample = isSample;
    }

    public long getLogId() {
        return logId;
    }

    public void setLogId(long logId) {
        this.logId = logId;
    }

    public Integer getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(Integer deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Integer getCommandId() {
        return commandId;
    }

    public void setCommandId(Integer commandId) {
        this.commandId = commandId;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getLogType() {
        return logType;
    }

    public void setLogType(String logType) {
        this.logType = logType;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public Timestamp getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Timestamp occurredAt) {
        this.occurredAt = occurredAt;
    }

    public boolean isIsSample() {
        return isSample;
    }

    public void setIsSample(boolean isSample) {
        this.isSample = isSample;
    }
}
