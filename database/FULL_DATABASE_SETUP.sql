-- PRJ301 Smart Misting. SQL Server 2019. Non-destructive, rerunnable setup.
-- This script preserves existing data. No DROP DATABASE or DELETE is performed.
USE master;
GO
IF DB_ID(N'MistingDB') IS NULL EXEC(N'CREATE DATABASE MistingDB');
GO
USE MistingDB;
GO
-- 1. AppUser – System Users & Credentials (MD5 Hashed)
IF OBJECT_ID(N'dbo.AppUser',N'U') IS NULL
CREATE TABLE AppUser (
    user_id        INT IDENTITY(1,1) PRIMARY KEY,
    username       NVARCHAR(50)  NOT NULL UNIQUE,
    password_hash  NVARCHAR(256) NOT NULL,
    full_name      NVARCHAR(100) NOT NULL,
    email          NVARCHAR(100),
    role_code      NVARCHAR(10)  NOT NULL 
                   CHECK (role_code IN ('ADMIN','STAFF','VIEWER')),
    status_text    NVARCHAR(100) DEFAULT 'Active',
    is_locked      BIT NOT NULL DEFAULT 0,
    is_deleted     BIT NOT NULL DEFAULT 0,
    created_at     DATETIME2 DEFAULT SYSDATETIME(),
    updated_at     DATETIME2 DEFAULT SYSDATETIME()
);

-- 2. Plant – Botanical Profiles & Optimal Irrigation Ranges
IF OBJECT_ID(N'dbo.Plant',N'U') IS NULL
CREATE TABLE Plant (
    plant_id      INT IDENTITY(1,1) PRIMARY KEY,
    plant_name    NVARCHAR(100) NOT NULL,
    species       NVARCHAR(100),
    humidity_on   FLOAT DEFAULT 60.0,
    humidity_off  FLOAT DEFAULT 70.0,
    planted_date  DATE,
    note          NVARCHAR(500),
    is_deleted    BIT NOT NULL DEFAULT 0,
    created_by    INT REFERENCES AppUser(user_id),
    created_at    DATETIME2 DEFAULT SYSDATETIME()
);

-- 3. Device – Microcontroller Units (Arduino Uno / Nano)
IF OBJECT_ID(N'dbo.Device',N'U') IS NULL
CREATE TABLE Device (
    device_id    INT IDENTITY(1,1) PRIMARY KEY,
    device_code  NVARCHAR(50) NOT NULL UNIQUE,
    device_name  NVARCHAR(100) NOT NULL,
    api_key_hash NVARCHAR(256),
    last_seen    DATETIME2,
    is_active    BIT NOT NULL DEFAULT 1
);

-- 4. MistingSetting – Automated Thresholds & Safety Limits
IF OBJECT_ID(N'dbo.MistingSetting',N'U') IS NULL
CREATE TABLE MistingSetting (
    device_id      INT PRIMARY KEY REFERENCES Device(device_id),
    humidity_on    FLOAT NOT NULL DEFAULT 60.0,
    humidity_off   FLOAT NOT NULL DEFAULT 70.0,
    max_run_sec    INT   NOT NULL DEFAULT 15,
    cooldown_sec   INT   NOT NULL DEFAULT 0,
    desired_mode   NVARCHAR(10) NOT NULL DEFAULT 'AUTO'
                   CHECK (desired_mode IN ('AUTO','MANUAL')),
    version        INT NOT NULL DEFAULT 1,
    updated_at     DATETIME2 DEFAULT SYSDATETIME()
);

-- 5. SensorReading – Telemetry Stream from Sensors
IF OBJECT_ID(N'dbo.SensorReading',N'U') IS NULL
CREATE TABLE SensorReading (
    reading_id       BIGINT IDENTITY(1,1) PRIMARY KEY,
    device_id        INT REFERENCES Device(device_id),
    packet_id        NVARCHAR(50),
    temperature_c    FLOAT,
    humidity_pct     FLOAT,
    water_ok         BIT,
    sensor_ok        BIT NOT NULL DEFAULT 1,
    reported_mode    NVARCHAR(10),
    pump_on          BIT NOT NULL DEFAULT 0,
    applied_version  INT,
    measured_at      DATETIME2,
    received_at      DATETIME2 DEFAULT SYSDATETIME(),
    is_sample        BIT NOT NULL DEFAULT 0,
    is_raining       BIT NOT NULL DEFAULT 0,
    water_pct        FLOAT NULL CHECK (water_pct BETWEEN 0 AND 100),
    lock_reason      NVARCHAR(30) NULL,
    air_temperature  FLOAT NULL,                       -- Ambient air temperature from DHT11 (°C)
    air_humidity     FLOAT NULL,                       -- Ambient air relative humidity from DHT11 (%)
    dht_ok           BIT NOT NULL DEFAULT 0,           -- 1 when DHT11 sensor reading is valid
    heat_stress      BIT NOT NULL DEFAULT 0,           -- 1 when thermal override (temp >= 38C) active
    CONSTRAINT UQ_device_packet UNIQUE (device_id, packet_id)
);

-- 6. ControlCommand – Actuator Commands & Feedback
IF OBJECT_ID(N'dbo.ControlCommand',N'U') IS NULL
CREATE TABLE ControlCommand (
    command_id    INT IDENTITY(1,1) PRIMARY KEY,
    device_id     INT REFERENCES Device(device_id),
    user_id       INT REFERENCES AppUser(user_id),
    command_type  NVARCHAR(20) NOT NULL
                  CHECK (command_type IN ('START','STOP','SET_MODE','SYNC_SETTING')),
    payload_json  NVARCHAR(500),
    status        NVARCHAR(10) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','ACKED','FAILED','EXPIRED')),
    created_at    DATETIME2 DEFAULT SYSDATETIME(),
    expires_at    DATETIME2,
    ack_at        DATETIME2,
    dispatched_at DATETIME2
);

-- 7. ActivityLog – SCADA Audit Trail & Operations History
IF OBJECT_ID(N'dbo.ActivityLog',N'U') IS NULL
CREATE TABLE ActivityLog (
    log_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
    device_id   INT REFERENCES Device(device_id),
    user_id     INT REFERENCES AppUser(user_id),
    command_id  INT REFERENCES ControlCommand(command_id),
    event_id    NVARCHAR(50) UNIQUE,
    log_type    NVARCHAR(10) NOT NULL
                CHECK (log_type IN ('MISTING','ADMIN')),
    action      NVARCHAR(100) NOT NULL,
    detail      NVARCHAR(500),
    occurred_at DATETIME2 DEFAULT SYSDATETIME(),
    is_sample   BIT NOT NULL DEFAULT 0
);

-- 8. RolePermission – Dynamic RBAC Access Control Matrix
IF OBJECT_ID(N'dbo.RolePermission',N'U') IS NULL
CREATE TABLE RolePermission (
    role_code       NVARCHAR(10) NOT NULL CHECK (role_code IN ('ADMIN','STAFF','VIEWER')),
    module_code     NVARCHAR(50) NOT NULL,
    can_access      BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (role_code, module_code)
);
GO

-- 9. Performance Indexes for Real-time SCADA Polling & Query Optimization
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='idx_sensor_device_time' AND object_id=OBJECT_ID('dbo.SensorReading'))
CREATE INDEX idx_sensor_device_time ON SensorReading (device_id, reading_id DESC);
CREATE INDEX idx_sensor_received    ON SensorReading (received_at DESC);
CREATE INDEX idx_activity_time      ON ActivityLog (occurred_at DESC);
CREATE INDEX idx_command_device     ON ControlCommand (device_id, created_at DESC);
GO

GO
IF COL_LENGTH('SensorReading','water_pct') IS NULL ALTER TABLE SensorReading ADD water_pct FLOAT NULL;
IF COL_LENGTH('SensorReading','lock_reason') IS NULL ALTER TABLE SensorReading ADD lock_reason NVARCHAR(30) NULL;
IF COL_LENGTH('SensorReading','air_temperature') IS NULL ALTER TABLE SensorReading ADD air_temperature FLOAT NULL;
IF COL_LENGTH('SensorReading','air_humidity') IS NULL ALTER TABLE SensorReading ADD air_humidity FLOAT NULL;
IF COL_LENGTH('SensorReading','dht_ok') IS NULL ALTER TABLE SensorReading ADD dht_ok BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('SensorReading','heat_stress') IS NULL ALTER TABLE SensorReading ADD heat_stress BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('ControlCommand','dispatched_at') IS NULL ALTER TABLE ControlCommand ADD dispatched_at DATETIME2 NULL;
GO

-- Rerunnable classroom seed. Password for seed users: 12345.
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
-- Convert old soil-based default bounds to the integrated air RH defaults.
UPDATE MistingSetting SET humidity_on=60,humidity_off=70,cooldown_sec=0,version=version+1
WHERE device_id=1 AND humidity_on IN (40,50) AND humidity_off=65;
GO
-- Convert old soil-based default bounds to the integrated air RH defaults.
UPDATE MistingSetting SET humidity_on=60,humidity_off=70,cooldown_sec=0,version=version+1
WHERE device_id=1 AND humidity_on IN (40,50) AND humidity_off=65;
GO
-- 100 labeled historical sample readings. Samples never authorize physical START.
DECLARE @i int=1;
WHILE @i<=100
BEGIN
 IF NOT EXISTS(SELECT 1 FROM SensorReading WHERE device_id=1 AND packet_id=CONCAT('DEMO-SEED-',@i))
 INSERT SensorReading(device_id,packet_id,temperature_c,humidity_pct,water_pct,water_ok,sensor_ok,reported_mode,pump_on,is_sample,is_raining,air_temperature,air_humidity,dht_ok,lock_reason,received_at)
 VALUES(1,CONCAT('DEMO-SEED-',@i),26,45+(@i%10),80,1,1,'AUTO',CASE WHEN @i%10<5 THEN 1 ELSE 0 END,1,0,26,55+(@i%20),1,'NONE',DATEADD(minute,-(101-@i),SYSDATETIME()));
 SET @i=@i+1;
END;
-- 10 paired sample misting sessions in the audit trail.
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
-- Normalized role matrix used by the DAO and filter. Existing decisions are preserved.
INSERT RolePermission(role_code,module_code,can_access)
SELECT r.role_code,m.module_code,CASE WHEN r.role_code='ADMIN' THEN 1 WHEN r.role_code='STAFF' AND m.module_code NOT IN ('USER_MANAGEMENT','DEVICE_MANAGEMENT') THEN 1 WHEN r.role_code='VIEWER' AND m.module_code IN ('DASHBOARD','LOGS_EXPORT') THEN 1 ELSE 0 END
FROM (VALUES('ADMIN'),('STAFF'),('VIEWER'))r(role_code)
CROSS JOIN (VALUES('DASHBOARD'),('PUMP_OVERRIDE'),('AUTO_SETTINGS'),('PLANT_CATALOG'),('LOGS_EXPORT'),('USER_MANAGEMENT'),('DEVICE_MANAGEMENT'))m(module_code)
WHERE NOT EXISTS(SELECT 1 FROM RolePermission p WHERE p.role_code=r.role_code AND p.module_code=m.module_code);
GO
PRINT N'PRJ301 setup completed. Seed accounts admin01 / staff01 / viewer01 use password 12345.';
