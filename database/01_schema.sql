-- ============================================================
-- FILE: 01_schema.sql
-- DATABASE: MistingDB
-- PROJECT: Smart Misting PRJ301 – Group 5
-- ============================================================

CREATE DATABASE MistingDB;
GO
USE MistingDB;
GO

-- 1. AppUser – Tài khoản người dùng
CREATE TABLE AppUser (
    user_id        INT IDENTITY(1,1) PRIMARY KEY,
    username       NVARCHAR(50)  NOT NULL UNIQUE,
    password_hash  NVARCHAR(256) NOT NULL,
    full_name      NVARCHAR(100) NOT NULL,
    email          NVARCHAR(100),
    role_code      NVARCHAR(10)  NOT NULL 
                   CHECK (role_code IN ('ADMIN','STAFF','VIEWER')),
    is_locked      BIT NOT NULL DEFAULT 0,
    is_deleted     BIT NOT NULL DEFAULT 0,
    created_at     DATETIME2 DEFAULT SYSDATETIME(),
    updated_at     DATETIME2 DEFAULT SYSDATETIME()
);

-- 2. Plant – Hồ sơ cây
CREATE TABLE Plant (
    plant_id      INT IDENTITY(1,1) PRIMARY KEY,
    plant_name    NVARCHAR(100) NOT NULL,
    species       NVARCHAR(100),
    planted_date  DATE,
    note          NVARCHAR(500),
    is_deleted    BIT NOT NULL DEFAULT 0,
    created_by    INT REFERENCES AppUser(user_id),
    created_at    DATETIME2 DEFAULT SYSDATETIME()
);

-- 3. Device – Thiết bị ESP32/Arduino
CREATE TABLE Device (
    device_id    INT IDENTITY(1,1) PRIMARY KEY,
    device_code  NVARCHAR(50) NOT NULL UNIQUE,
    device_name  NVARCHAR(100) NOT NULL,
    api_key_hash NVARCHAR(256),
    last_seen    DATETIME2,
    is_active    BIT NOT NULL DEFAULT 1
);

-- 4. MistingSetting – Cấu hình ngưỡng phun
CREATE TABLE MistingSetting (
    device_id      INT PRIMARY KEY REFERENCES Device(device_id),
    humidity_on    FLOAT NOT NULL DEFAULT 60.0,
    humidity_off   FLOAT NOT NULL DEFAULT 70.0,
    max_run_sec    INT   NOT NULL DEFAULT 10,
    cooldown_sec   INT   NOT NULL DEFAULT 60,
    desired_mode   NVARCHAR(10) NOT NULL DEFAULT 'AUTO'
                   CHECK (desired_mode IN ('AUTO','MANUAL')),
    version        INT NOT NULL DEFAULT 1,
    updated_at     DATETIME2 DEFAULT SYSDATETIME()
);

-- 5. SensorReading – Số đo từ thiết bị
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
    CONSTRAINT UQ_device_packet UNIQUE (device_id, packet_id)
);

-- 6. ControlCommand – Lệnh điều khiển
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
    ack_at        DATETIME2
);

-- 7. ActivityLog – Nhật ký hoạt động
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
GO
