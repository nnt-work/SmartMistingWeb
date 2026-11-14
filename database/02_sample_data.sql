
USE MistingDB;
GO
IF NOT EXISTS(SELECT 1 FROM AppUser WHERE username='admin01')
 INSERT AppUser(username,password_hash,full_name,email,role_code) VALUES('admin01','827ccb0eea8a706c4c34a16891f84e7b',N'Administrator','admin@example.com','ADMIN');
IF NOT EXISTS(SELECT 1 FROM AppUser WHERE username='staff01')
 INSERT AppUser(username,password_hash,full_name,email,role_code) VALUES('staff01','827ccb0eea8a706c4c34a16891f84e7b',N'Operator','staff@example.com','STAFF');
IF NOT EXISTS(SELECT 1 FROM AppUser WHERE username='viewer01')
 INSERT AppUser(username,password_hash,full_name,email,role_code) VALUES('viewer01','827ccb0eea8a706c4c34a16891f84e7b',N'Observer','viewer@example.com','VIEWER');
IF NOT EXISTS(SELECT 1 FROM Device WHERE device_id=1)
BEGIN
 SET IDENTITY_INSERT Device ON;
 INSERT Device(device_id,device_code,device_name,is_active) VALUES(1,'ARD-01',N'Arduino Uno R3 Jewel Orchid Terrarium',1);
 SET IDENTITY_INSERT Device OFF;
END;
IF NOT EXISTS(SELECT 1 FROM MistingSetting WHERE device_id=1)
 INSERT MistingSetting(device_id,humidity_on,humidity_off,max_run_sec,cooldown_sec,desired_mode) VALUES(1,60,70,15,0,'AUTO');
IF NOT EXISTS(SELECT 1 FROM Plant WHERE plant_name=N'Jewel Orchid Terrarium')
 INSERT Plant(plant_name,species,humidity_on,humidity_off,note,created_by) SELECT N'Jewel Orchid Terrarium',N'Classroom jewel orchid model',60,70,N'Project RH thresholds; soil and water use independent safety gates.',user_id FROM AppUser WHERE username='admin01';
GO

UPDATE MistingSetting SET humidity_on=60,humidity_off=70,cooldown_sec=0,version=version+1
WHERE device_id=1 AND humidity_on IN (40,50) AND humidity_off=65;
GO

UPDATE MistingSetting SET humidity_on=60,humidity_off=70,cooldown_sec=0,version=version+1
WHERE device_id=1 AND humidity_on IN (40,50) AND humidity_off=65;
GO

DECLARE @i int=1;
WHILE @i<=100
BEGIN
 IF NOT EXISTS(SELECT 1 FROM SensorReading WHERE device_id=1 AND packet_id=CONCAT('DEMO-SEED-',@i))
 INSERT SensorReading(device_id,packet_id,temperature_c,humidity_pct,water_pct,water_ok,sensor_ok,reported_mode,pump_on,is_sample,is_raining,air_temperature,air_humidity,dht_ok,lock_reason,received_at)
 VALUES(1,CONCAT('DEMO-SEED-',@i),26,45+(@i%10),80,1,1,'AUTO',CASE WHEN @i%10<5 THEN 1 ELSE 0 END,1,0,26,55+(@i%20),1,'NONE',DATEADD(minute,-(101-@i),SYSDATETIME()));
 SET @i=@i+1;
END;

SET @i=1;
WHILE @i<=10
BEGIN
 IF NOT EXISTS(SELECT 1 FROM ActivityLog WHERE event_id=CONCAT('DEMO-SESSION-',@i,'-START'))
 INSERT ActivityLog(device_id,event_id,log_type,action,detail,is_sample,occurred_at) VALUES(1,CONCAT('DEMO-SESSION-',@i,'-START'),'MISTING','SAMPLE_START',N'Labeled classroom sample session',1,DATEADD(minute,-@i*8,SYSDATETIME()));
 IF NOT EXISTS(SELECT 1 FROM ActivityLog WHERE event_id=CONCAT('DEMO-SESSION-',@i,'-STOP'))
 INSERT ActivityLog(device_id,event_id,log_type,action,detail,is_sample,occurred_at) VALUES(1,CONCAT('DEMO-SESSION-',@i,'-STOP'),'MISTING','SAMPLE_STOP',N'Labeled classroom sample session',1,DATEADD(second,15,DATEADD(minute,-@i*8,SYSDATETIME())));
 SET @i=@i+1;
END;
GO

INSERT RolePermission(role_code,module_code,can_access)
SELECT r.role_code,m.module_code,CASE WHEN r.role_code='ADMIN' THEN 1 WHEN r.role_code='STAFF' AND m.module_code NOT IN ('USER_MANAGEMENT','DEVICE_MANAGEMENT') THEN 1 WHEN r.role_code='VIEWER' AND m.module_code IN ('DASHBOARD','LOGS_EXPORT') THEN 1 ELSE 0 END
FROM (VALUES('ADMIN'),('STAFF'),('VIEWER'))r(role_code)
CROSS JOIN (VALUES('DASHBOARD'),('PUMP_OVERRIDE'),('AUTO_SETTINGS'),('PLANT_CATALOG'),('LOGS_EXPORT'),('USER_MANAGEMENT'),('DEVICE_MANAGEMENT'))m(module_code)
WHERE NOT EXISTS(SELECT 1 FROM RolePermission p WHERE p.role_code=r.role_code AND p.module_code=m.module_code);
GO
PRINT N'PRJ301 setup completed. Seed accounts admin01 / staff01 / viewer01 use password 12345.';
