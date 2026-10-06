USE MistingDB;
GO

-- Admin mặc định (password: 12345)
-- MD5 của '12345' là '827ccb0eea8a706c4c34a16891f84e7b'
INSERT INTO AppUser (username, password_hash, full_name, email, role_code)
VALUES
  ('admin01', '827ccb0eea8a706c4c34a16891f84e7b', N'Administrator', 'admin@example.com', 'ADMIN'),
  ('staff01', '827ccb0eea8a706c4c34a16891f84e7b', N'Nguyễn Văn Staff', 'staff@example.com', 'STAFF'),
  ('viewer01','827ccb0eea8a706c4c34a16891f84e7b', N'Trần Thị Viewer', 'viewer@example.com', 'VIEWER');

-- Thiết bị demo
INSERT INTO Device (device_code, device_name, is_active)
VALUES ('ESP32-001', N'Bộ phun sương khu A', 1);

-- Cấu hình ngưỡng mặc định
INSERT INTO MistingSetting (device_id, humidity_on, humidity_off, max_run_sec, cooldown_sec, desired_mode)
VALUES (1, 60.0, 70.0, 10, 60, 'AUTO');

-- Dữ liệu cảm biến mẫu (is_sample = 1)
INSERT INTO SensorReading (device_id, packet_id, temperature_c, humidity_pct, water_ok, pump_on, reported_mode, is_sample)
VALUES
  (1, 'PKT-001', 28.5, 55.2, 1, 0, 'AUTO', 1),
  (1, 'PKT-002', 29.1, 45.0, 1, 1, 'AUTO', 1),
  (1, 'PKT-003', 27.8, 72.3, 1, 0, 'AUTO', 1);

-- Cây mẫu
INSERT INTO Plant (plant_name, species, planted_date, note)
VALUES
  (N'Cây Lan Hồ Điệp', N'Phalaenopsis', '2026-01-15', N'Tưới 2 lần/tuần'),
  (N'Cây Dương Xỉ',    N'Nephrolepis',  '2026-02-20', N'Ưa ẩm cao');
GO
