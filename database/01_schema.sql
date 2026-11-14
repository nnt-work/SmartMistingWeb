
USE master;
GO
IF DB_ID(N'MistingDB') IS NULL EXEC(N'CREATE DATABASE MistingDB');
GO
USE MistingDB;
GO

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

IF OBJECT_ID(N'dbo.Device',N'U') IS NULL
CREATE TABLE Device (
    device_id    INT IDENTITY(1,1) PRIMARY KEY,
    device_code  NVARCHAR(50) NOT NULL UNIQUE,
    device_name  NVARCHAR(100) NOT NULL,
    api_key_hash NVARCHAR(256),
    last_seen    DATETIME2,
    is_active    BIT NOT NULL DEFAULT 1
);

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
    air_temperature  FLOAT NULL,
    air_humidity     FLOAT NULL,
    dht_ok           BIT NOT NULL DEFAULT 0,
    heat_stress      BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_device_packet UNIQUE (device_id, packet_id)
);

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

IF OBJECT_ID(N'dbo.RolePermission',N'U') IS NULL
CREATE TABLE RolePermission (
    role_code       NVARCHAR(10) NOT NULL CHECK (role_code IN ('ADMIN','STAFF','VIEWER')),
    module_code     NVARCHAR(50) NOT NULL,
    can_access      BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (role_code, module_code)
);
GO

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
