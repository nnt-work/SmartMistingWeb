USE MistingDB;
GO
SELECT name FROM sys.tables ORDER BY name;
SELECT username,role_code,is_locked,is_deleted FROM AppUser;
SELECT * FROM MistingSetting;
SELECT COUNT(*) AS sample_readings FROM SensorReading WHERE is_sample=1;
SELECT COUNT(*) AS sample_sessions FROM ActivityLog WHERE action='SAMPLE_START';
SELECT TOP 10 reading_id,humidity_pct AS soil_pct,water_pct,air_humidity AS air_rh_pct,air_temperature,dht_ok,pump_on,reported_mode,is_sample,received_at FROM SensorReading ORDER BY reading_id DESC;
SELECT TOP 10 * FROM ControlCommand ORDER BY command_id DESC;
SELECT * FROM RolePermission ORDER BY role_code,module_code;

