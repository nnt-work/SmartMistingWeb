/*
 * =========================================================================================
 * HỆ THỐNG PHUN SƯƠNG THÔNG MINH - FIRMWARE ARDUINO UNO (V8.0 - PHUN LIÊN TỤC, SỬA ĐỌC ĐẤT A0)
 * Môn học: PRJ301 - Hệ thống Tự động hóa Nông nghiệp IoT
 * Phần cứng: Arduino Uno R3, Relay 5V (D8), LCD 16x2, Cảm biến Đất (A0), Nước (A2), DHT11 (A1)
 * Giao tiếp: USB Serial / Web Serial @ 9600 Baud (Dashboard chuyển JSON đến máy chủ; máy chủ gửi Discord)
 * Chế độ TỰ ĐỘNG (AUTO): RH < 60% thì BẬT liên tục; 60% <= RH < 70% giữ trạng thái; RH >= 70% TẮT.
 * Khóa ngắt ưu tiên (Priority Stops): Nhiệt độ < 18°C, Độ ẩm đất > 65%, Mực nước bình < 20%.
 * Cảm biến DHT11 phải hoạt động tốt. Relay kích mức THẤP (Active LOW); lệnh TẮT luôn thực thi ngay.
 * =========================================================================================
 *
 * SƠ ĐỒ ĐẤU NỐI CHÂN CẮM (PIN WIRING):
 * -----------------------------------------------------------------------------------------
 * 1. CẢM BIẾN ĐỘ ẨM ĐẤT (Analog):
 *    - VCC  --> Arduino 5V
 *    - GND  --> Arduino GND
 *    - AO   --> Chân Analog A0 (không đấu DO để lấy phần trăm)
 *    * Để khô ngoài không khí: Xung ADC ~980 - 1023 (0% độ ẩm)
 *    * Nhúng nước đã đo được ADC ~300: dùng giá trị 300 làm mốc ướt (100%)
 *
 * 2. CẢM BIẾN MỰC NƯỚC BÌNH CHỨA (Analog):
 *    - VCC  --> Arduino 5V
 *    - GND  --> Arduino GND
 *    - SIG  --> Chân Analog A2
 *    * Que đo khô / Ngoài không khí: Xung ADC <= 80 (Ép về 0% để chống chạy khô cháy bơm)
 *    * Cốc đầy nước: Xung ADC ~480 - 520 (100% mực nước)
 *    * Ngưỡng ngắt an toàn: < 20% (Dừng khẩn cấp để bảo vệ động cơ máy bơm)
 *
 * 3. MODULE RELAY 5V (Chân Digital D8 - Kích mức THẤP / Active LOW):
 *    - VCC  --> Arduino 5V
 *    - GND  --> Arduino GND
 *    - IN   --> Chân Digital D8 (Xuất LOW = BẬT phun sương, Xuất HIGH = TẮT máy bơm)
 *    - Dây nguồn máy bơm đấu qua cổng COM và NO (Thường mở), không đấu vào NC.
 *
 * 4. MÀN HÌNH LCD 16x2:
 *    - RS=12, EN=11, D4=5, D5=4, D6=3, D7=2, RW=GND, VSS=GND, VDD=5V
 *
 * 5. CỔNG USB SERIAL (Arduino Uno qua cáp USB):
 *    - Tốc độ 9600 Baud, 8 Data Bits, 1 Stop Bit, No Parity
 *
 * 6. CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM KHÔNG KHÍ DHT11:
 *    - VCC  --> Arduino 5V
 *    - GND  --> Arduino GND
 *    - DATA --> Chân A1 (chạy chế độ Digital; có trở kéo lên sẵn trên module hoặc gắn trở 4.7k-10k)
 711_
 * =========================================================================================
 */

#include <LiquidCrystal.h>
#include <DHT.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

// =========================================================================================
// PHẦN 1: CẤU HÌNH CHÂN CẮM PHẦN CỨNG
// =========================================================================================
const byte soilPin  = A0;  // Chân đọc cảm biến độ ẩm đất (Analog A0)
const byte waterPin = A2;  // Chân đọc cảm biến mực nước bình chứa (Analog A2)
const byte relayPin = 8;   // Chân điều khiển đóng/ngắt Relay máy bơm (Digital D8)

// DHT11 là cảm biến kỹ thuật số (Digital); chân A1 của Arduino hỗ trợ đọc Digital hoàn toàn bình thường
#define DHT_PIN A1
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Tín hiệu kích hoạt Relay: Module này là loại KÍCH MỨC THẤP (ACTIVE LOW)
const byte RELAY_ON  = LOW;  // Chân D8 xuất LOW  -> cuộn hút đóng -> tiếp điểm COM-NO nối thông -> Bơm CHẠY
const byte RELAY_OFF = HIGH; // Chân D8 xuất HIGH -> nhả cuộn hút -> tiếp điểm COM-NO hở -> Bơm TẮT

// Khai báo chân giao tiếp màn hình LCD 16x2 (RS, EN, D4, D5, D6, D7)
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

// =========================================================================================
// PHẦN 2: HIỆU CHUẨN CẢM BIẾN CHO MÔ HÌNH THỰC TẾ ĐỂ BÀN
// =========================================================================================
// Ngưỡng hiệu chuẩn cảm biến độ ẩm đất
const int soilDry = 980;   // Đầu dò để khô ngoài không khí: ADC ~980 - 1023 -> quy đổi thành 0%
const int soilWet = 300;   // ADC đo thực tế khi chạm nước ~300; hiệu chuẩn lại nếu đo đất ướt có giá trị khác

// Ngưỡng hiệu chuẩn cảm biến mực nước
const int waterEmpty = 80;  // Đầu dò khô ráo: ADC <= 80 -> ép cứng về 0%
const int waterFull  = 500; // Nhúng ngập trong cốc nước: ADC ~480 - 520 -> quy đổi thành 100%

// =========================================================================================
// PHẦN 3: CÁC NGƯỠNG LOGIC PHUN SƯƠNG & GIỚI HẠN AN TOÀN
// =========================================================================================
int humidityOn   = 60;       // Độ ẩm không khí (Air RH): Tự động BẬT phun khi dưới 60%
int humidityOff  = 70;       // Độ ẩm không khí (Air RH): Tự động TẮT phun khi đạt từ 70% trở lên
const float minTempC = 18.0; // Ngắt khóa an toàn nếu nhiệt độ dưới 18°C (đúng 18°C vẫn cho phép chạy)
const int maxSoil = 65;      // Ngắt khóa an toàn nếu độ ẩm đất vượt quá 65% (đúng 65% vẫn cho phép chạy)
const int minWater = 20;     // Ngắt khóa an toàn nếu nước trong bình dưới 20% (đúng 20% vẫn cho phép chạy)
// Không giới hạn thời gian phun/không nghỉ theo chu kỳ: relay chỉ ngắt khi có lệnh hoặc điều kiện dừng.

// Biến lưu trữ giá trị cảm biến thời gian thực
int soilRaw     = 0;     // Giá trị ADC trung bình của cảm biến đất
int soilPercent = 0;     // Phần trăm độ ẩm đất đã quy đổi (0 - 100%)
bool soilOk     = false; // Cờ tín hiệu analog A0 hợp lệ; ADC không thể đảm bảo phát hiện tuột dây

int waterRaw     = 0;    // Giá trị ADC trung bình của cảm biến mực nước
int waterPercent = 0;    // Phần trăm mực nước bình chứa đã quy đổi (0 - 100%)
bool waterOk     = false; // Cờ báo cảm biến mực nước kết nối tốt (false nếu tuột dây / floating)

// Biến giả lập mực nước phục vụ kiểm thử trên Web (-1 = dùng cảm biến thật, >= 0 = dùng mức nước giả lập)
int mockWaterPct = -1;

// Biến lưu Nhiệt độ & Độ ẩm không khí (DHT11) để điều khiển phun, gửi lên Web và bắn cảnh báo Discord
float airTempC = NAN;
float airHumPct = NAN;
bool dhtOk = false;
unsigned long lastDHTReadTime = 0;
unsigned long lastDHTSuccessTime = 0;
const unsigned long DHT_READ_INTERVAL = 1500UL;  // Chu kỳ đọc phần cứng DHT11: 1.5 giây/lần
const unsigned long DHT_STALE_INTERVAL = 7000UL; // Chỉ khóa DHT nếu quá 7s liên tiếp không có mẫu hợp lệ (tránh relay nhấp nháy khi 1 lần đọc lỗi).

// Hàm cập nhật dữ liệu từ cảm biến DHT11
void updateDHT() {
  unsigned long now = millis();
  if (now - lastDHTReadTime < DHT_READ_INTERVAL) return;
  lastDHTReadTime = now;

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h) && h >= 0.0 && h <= 100.0 && t >= -10.0 && t <= 80.0) {
    airTempC = t;
    airHumPct = h;
    lastDHTSuccessTime = now;
    dhtOk = true;
  }
  // Một lần đọc DHT11 lỗi không được phép tạo nhịp OFF giả. Dùng dữ liệu cuối
  // trong tối đa 7 giây; nếu không có dữ liệu từ khởi động hoặc mất quá 7 giây,
  // đánh dấu cảm biến lỗi và tắt relay theo nhánh an toàn.
  if (lastDHTSuccessTime == 0 || now - lastDHTSuccessTime >= DHT_STALE_INTERVAL) {
    dhtOk = false;
    airTempC = NAN;
    airHumPct = NAN;
  }
}

// =========================================================================================
// PHẦN 4: BIẾN TRẠNG THÁI HỆ THỐNG & BỘ ĐẾM THỜI GIAN ĐA NHIỆM (NON-BLOCKING)
// =========================================================================================
bool pumpOn       = false; // Trạng thái máy bơm thực tế (true = đang phun, false = đang tắt)
bool autoMode     = true;  // Chế độ hoạt động (true = Tự động AUTO, false = Thủ công MANUAL)
bool manualRequestedOn = false; // Lệnh START mong muốn; tự bật khi hết 2.5s chống dội, không cần nhấn START lại.
bool sensorsReady = false; // Cờ xác nhận đã lấy mẫu cảm biến lần đầu tiên sau khi khởi động

// Các mốc thời gian phục vụ chạy đa nhiệm không dùng delay()
unsigned long lastSensorRead = 0; // Thời điểm lần cuối đọc cảm biến
unsigned long lastLCDUpdate  = 0; // Thời điểm lần cuối làm mới màn hình LCD
unsigned long lastJSONSend   = 0; // Thời điểm lần cuối gửi gói tin JSON lên Web

const unsigned long sensorInterval = 500;  // Đọc cảm biến mỗi 500ms (0.5 giây)
const unsigned long lcdInterval    = 2000; // Chuyển trang màn hình LCD mỗi 2000ms (2 giây)
const unsigned long jsonInterval   = 1000; // Gửi dữ liệu JSON lên Web mỗi 1000ms (1 giây)

byte lcdPage = 0; // Trang hiển thị hiện tại trên LCD (Trang 0: Đất/Nước/Trạng thái, Trang 1: Nhiệt độ/Độ ẩm KK)

// Bộ đệm nhận chuỗi lệnh điều khiển từ cổng Serial
char commandBuffer[48];
byte commandIndex = 0;

// =========================================================================================
// PHẦN 5: KIỂM TRA KHÓA AN TOÀN LIÊN ĐỘNG & GỬI SỰ KIỆN DISCORD
// =========================================================================================
// Bảng mã nguyên nhân dừng/khóa bơm dùng chung cho cả AUTO, MANUAL, màn hình LCD và gói tin JSON.
// Kiểm tra tình trạng sống của cảm biến trước tiên vì nếu cảm biến chết thì số liệu không còn đáng tin cậy.
const byte STOP_NONE    = 0; // 0: An toàn, không có lỗi
const byte STOP_SENSORS = 1; // 1: Cảm biến chưa sẵn sàng
const byte STOP_DHT     = 2; // 2: Lỗi tuột dây hoặc hỏng cảm biến DHT11
const byte STOP_TEMP    = 3; // 3: Nhiệt độ môi trường quá lạnh (< 18°C)
const byte STOP_SOIL    = 4; // 4: Đất đã quá ướt (> 65%)
const byte STOP_WATER   = 5; // 5: Bình chứa cạn nước (< 20%)
const byte STOP_RH      = 6; // 6: Độ ẩm không khí đã đạt ngưỡng đủ ẩm (>= 70%)

// Hàm kiểm tra và trả về mã nguyên nhân phải dừng máy bơm theo thứ tự ưu tiên từ cao xuống thấp
byte getStopReason() {
  if (!sensorsReady || !soilOk || !waterOk) return STOP_SENSORS;
  if (!dhtOk || isnan(airTempC) || isnan(airHumPct)) return STOP_DHT;
  if (airTempC < minTempC) return STOP_TEMP;
  if (soilPercent > maxSoil) return STOP_SOIL;
  if (waterPercent < minWater) return STOP_WATER;
  if (autoMode && airHumPct >= humidityOff) return STOP_RH;
  return STOP_NONE;
}

// Chuyển mã số thành tên chuỗi để gửi trong gói JSON cho Web và Discord dễ đọc
const char* stopReasonName(byte reason) {
  switch (reason) {
    case STOP_SENSORS: return "SENSORS";
    case STOP_DHT:     return "DHT";
    case STOP_TEMP:    return "TEMP";
    case STOP_SOIL:    return "SOIL";
    case STOP_WATER:   return "WATER";
    case STOP_RH:      return "RH";
    default:           return "NONE";
  }
}

// Hệ thống chỉ thực sự an toàn để bật bơm khi không vướng bất kỳ lý do khóa nào
bool safetyOK() {
  return getStopReason() == STOP_NONE;
}

// Xuất tín hiệu sự kiện [EVT:...] qua cổng Serial khi máy bơm đang chạy mà bị ngắt để Web bắn thông báo về Discord
void printStopReason() {
  switch (getStopReason()) {
    case STOP_SENSORS:
      Serial.println(F("[EVT:SAFETY_STOP_SENSORS] Sensors not ready. Pump stopped."));
      break;
    case STOP_DHT:
      Serial.println(F("[EVT:SAFETY_STOP_DHT] DHT11 missing or stale (Check A1). Pump stopped."));
      break;
    case STOP_TEMP:
      Serial.println(F("[EVT:SAFETY_STOP_TEMP] Temperature below 18C (<18.0C). Pump stopped."));
      break;
    case STOP_SOIL:
      Serial.println(F("[EVT:SAFETY_STOP_SOIL] Soil moisture above 65% (>65%). Pump stopped."));
      break;
    case STOP_WATER:
      Serial.println(F("[EVT:SAFETY_STOP_WATER] Low water cutoff (<20%). Pump stopped."));
      break;
    case STOP_RH:
      Serial.print(F("[EVT:AUTO_STOP_RH] Air RH reached target (>="));
      Serial.print(humidityOff);
      Serial.println(F("%). Pump STOPPED."));
      break;
  }
}

// Xuất tín hiệu từ chối [EVT:REFUSED_...] khi người dùng bấm nút Bật Bơm trên Web nhưng hệ thống đang bị khóa an toàn
void printRefusedReason() {
  switch (getStopReason()) {
    case STOP_SENSORS:
      Serial.println(F("[EVT:REFUSED_SENSORS] Sensors not ready. Pump blocked."));
      break;
    case STOP_DHT:
      Serial.println(F("[EVT:REFUSED_DHT] DHT11 missing or stale. Check A1. Pump blocked."));
      break;
    case STOP_TEMP:
      Serial.println(F("[EVT:REFUSED_TEMP] Temperature cutoff (<18C). Pump blocked."));
      break;
    case STOP_SOIL:
      Serial.println(F("[EVT:REFUSED_SOIL] Soil moisture high (>65%). Pump blocked."));
      break;
    case STOP_WATER:
      Serial.println(F("[EVT:REFUSED_WATER] Low water cutoff (<20%). Pump blocked."));
      break;
    case STOP_RH:
      Serial.print(F("[EVT:REFUSED_RH] Air RH already at or above "));
      Serial.print(humidityOff);
      Serial.println(F("%. Pump blocked."));
      break;
  }
}

void recoverLCD(); // Khai báo trước hàm tự phục hồi màn hình LCD chống nhiễu điện từ

// Cơ chế chống đóng/ngắt Relay liên tục gây hỏng tiếp điểm và sụt áp nguồn USB
unsigned long lastPumpSwitchTime = 0;
unsigned long pumpOnSince = 0;  // Chỉ để theo dõi đã phun bao lâu, KHÔNG dùng để ngắt relay.
const unsigned long pumpSwitchCooldown = 2500; // Phải chờ tối thiểu 2.5 giây trước khi cho phép bật lại máy bơm

// =========================================================================================
// PHẦN 6: ĐIỀU KHIỂN ĐÓNG/NGẮT PHẦN CỨNG RELAY MÁY BƠM
// =========================================================================================
// Bật hoặc tắt Relay máy bơm một cách an toàn.
// Chốt chặn cứng: Không bao giờ cho phép bật bơm nếu safetyOK() trả về false.
void setPump(bool on) {
  // Nếu có lệnh yêu cầu BẬT nhưng điều kiện an toàn đang vi phạm -> ép thành lệnh TẮT
  if (on && !safetyOK()) {
    on = false;
  }

  // Chỉ thực thi khi trạng thái mới khác với trạng thái hiện tại của bơm
  if (pumpOn != on) {
    // Chỉ chống bật lại liên tiếp trong 2.5s; đây KHÔNG PHẢI thời gian phun/nghỉ. Lệnh OFF luôn thực thi ngay!
    if (on && millis() - lastPumpSwitchTime < pumpSwitchCooldown && lastPumpSwitchTime > 0) {
      return;
    }

    pumpOn = on;
    lastPumpSwitchTime = millis();
    if (pumpOn) pumpOnSince = millis();
    // Bước 1: Xuất tín hiệu vật lý ra chân D8 (LOW = Bật, HIGH = Tắt)
    digitalWrite(relayPin, pumpOn ? RELAY_ON : RELAY_OFF);

    // Chờ 40ms sau lúc đổi trạng thái relay để ổn định LCD; không ảnh hưởng thời gian phun.
    delay(40);

    // Bước 3: Tự động khởi tạo lại chip màn hình LCD để xóa sạch mọi ký tự rác do nhiễu điện gây ra
    recoverLCD();
  }
}

// =========================================================================================
// PHẦN 7: ĐỌC CẢM BIẾN ANALOG 20 MẪU, SỬA LỖI SOIL A0
// =========================================================================================
// Đọc trung bình 20 lần. Riêng chân cảm biến đất A0 KHÔNG chuyển OUTPUT LOW/HIGH
// để kiểm tra trở kháng, vì thao tác đó có thể làm dữ liệu sai/mất kết nối giả.
// Với analogRead không thể phát hiện chắc chắn mọi trường hợp rút dây.
void readSensors() {
  // 1. ĐỌC CẢM BIẾN ĐỘ ẨM ĐẤT (Chân AO cua module -> Arduino A0)
  // Khong ep A0 sang OUTPUT LOW/HIGH de thu day: thao tac nay co the
  // nap/xả dien tren ngo ra analog, gay bao loi gia khi cam bien van tot.
  pinMode(soilPin, INPUT);
  digitalWrite(soilPin, LOW); // Bao dam khong bat dien tro pull-up noi bo.
  analogRead(soilPin);        // Bo mau dau sau khi chuyen kenh ADC.

  long soilSum = 0;
  for (int i = 0; i < 20; i++) {
    soilSum += analogRead(soilPin);
    delayMicroseconds(100);
  }
  soilRaw = (int)(soilSum / 20);

  // Gia tri gan sat hai dau ADC co the do dut day, cham day hoac loi module.
  // Luu y: chi dua vao analogRead KHONG the phat hien moi truong hop tut day.
  // Khi tin hieu bat thuong, dong bo ve an toan bang soilOk = false.
  if (soilRaw >= 1018 || soilRaw <= 15) {
    soilOk = false;
    soilPercent = -1;
  } else {
    soilOk = true;
    soilPercent = map(soilRaw, soilDry, soilWet, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);
  }

  // 2. ĐỌC CẢM BIẾN MỰC NƯỚC BÌNH CHỨA (Chân A2)
  if (mockWaterPct >= 0) {
    waterOk = true;
    waterPercent = mockWaterPct;
    waterRaw = map(mockWaterPct, 0, 100, waterEmpty, waterFull);
  } else {
    pinMode(waterPin, OUTPUT);
    digitalWrite(waterPin, LOW);
    delayMicroseconds(10);
    pinMode(waterPin, INPUT);
    delayMicroseconds(40);
    int waterPullLow = analogRead(waterPin);

    pinMode(waterPin, OUTPUT);
    digitalWrite(waterPin, HIGH);
    delayMicroseconds(10);
    pinMode(waterPin, INPUT);
    delayMicroseconds(40);
    int waterPullHigh = analogRead(waterPin);

    if (abs(waterPullHigh - waterPullLow) > 250 || waterPullHigh >= 1021) {
      waterOk = false;
      waterRaw = waterPullHigh;
      waterPercent = -1;
    } else {
      long waterSum = 0;
      for (int i = 0; i < 20; i++) {
        waterSum += analogRead(waterPin);
        delayMicroseconds(100);
      }
      waterRaw = (int)(waterSum / 20);
      waterOk = true;
      if (waterRaw <= waterEmpty) {
        waterPercent = 0;
      } else {
        waterPercent = map(waterRaw, waterEmpty, waterFull, 0, 100);
        waterPercent = constrain(waterPercent, 0, 100);
      }
    }
  }

  sensorsReady = true;
  updateDHT();  // Đọc thêm Nhiệt độ & Độ ẩm không khí từ DHT11
}

// =========================================================================================
// PHẦN 8: PHUN LIÊN TỤC: KHÔNG CÓ BẤT KỲ BỘ ĐẾM TỰ NGẮT NÀO
// =========================================================================================
// Thứ tự ưu tiên áp dụng cho AUTO + MANUAL:
//   1) Mất cảm biến kéo dài / T < 18°C / đất > 65% / nước < 20% => OFF ở mọi chế độ.
//   2) MANUAL: START -> ON liên tục; STOP -> OFF, không có giới hạn thời gian / ngưỡng RH tự dừng.
//   3) AUTO: RH < 60% => ON liên tục; 60% <= RH < 70% => giữ nguyên;
//      RH >= 70% => OFF.
// Không dùng watchdog 15s, thời gian nghỉ 45s hoặc bộ đếm 3 hiệp.
void controlPump() {
  if (!safetyOK()) {
    manualRequestedOn = false; // Lỗi an toàn hủy lệnh START đang chờ, cần START lại khi đã khắc phục.
    if (pumpOn) {
      printStopReason();
      setPump(false); // Lệnh OFF luôn ưu tiên, không bị trì hoãn bởi chống dội relay.
    }
    return;
  }

  if (!autoMode) {
    // MANUAL: Lệnh START phải được duy trì; nếu relay vừa tắt và đang chống dội,
    // tự bật khi đủ 2.5s thay vì buộc người dùng nhấn START lại.
    if (manualRequestedOn && !pumpOn) setPump(true);
    return;
  }

  if (!pumpOn && airHumPct < humidityOn) {
    setPump(true);
    if (pumpOn) {
      Serial.print(F("[EVT:AUTO_START] Air RH below "));
      Serial.print(humidityOn);
      Serial.println(F("%. Pump ON continuously until stop condition."));
    }
  }
  // Nếu bơm đang bật và RH đạt 60..69.9% => tiếp tục phun cho đến RH >=70%.
  // Nếu bơm đang tắt và RH đạt 60..69.9% => tiếp tục tắt (hysteresis).
}

// =========================================================================================
// PHẦN 9: ĐÓNG GÓI VÀ GỬI DỮ LIỆU JSON LÊN WEB DASHBOARD & DISCORD
// =========================================================================================
// Hàm chạy định kỳ mỗi 1 giây: Đóng gói toàn bộ thông số cảm biến và trạng thái thành chuỗi JSON.
// Phía Web Dashboard sẽ đọc chuỗi JSON này để:
// 1. Cập nhật số liệu trực quan lên màn hình theo dõi.
// 2. Kiểm tra điều kiện: RH (<60% phun, >=70% dừng), Nhiệt độ (<18°C khóa), Đất (>65% khóa), Nước (<20% khóa).
// 3. Tự động gửi tin nhắn thông báo/cảnh báo có định dạng đẹp về kênh Discord qua Webhook.
void sendJSON() {
  byte stopReason = getStopReason();

  // Xuất chuỗi JSON chuẩn cho bộ phân tích trên Web Dashboard & Discord
  Serial.print(F("{\"soil\":"));
  if (soilOk && soilPercent >= 0) Serial.print(soilPercent);
  else Serial.print(F("null"));
  Serial.print(F(",\"soil_raw\":"));
  Serial.print(soilRaw);
  Serial.print(F(",\"soil_ok\":"));
  Serial.print(soilOk ? 1 : 0);
  Serial.print(F(",\"humidity\":"));
  if (soilOk && soilPercent >= 0) Serial.print(soilPercent);
  else Serial.print(F("null"));
  Serial.print(F(",\"water\":"));
  if (waterOk && waterPercent >= 0) Serial.print(waterPercent);
  else Serial.print(F("null"));
  Serial.print(F(",\"water_raw\":"));
  Serial.print(waterRaw);
  Serial.print(F(",\"water_ok\":"));
  Serial.print((waterOk && waterPercent >= minWater) ? 1 : 0);
  Serial.print(F(",\"water_valid\":"));
  Serial.print(waterOk ? 1 : 0);
  Serial.print(F(",\"pump\":"));
  Serial.print(pumpOn ? 1 : 0);
  Serial.print(F(",\"pump_on\":"));
  Serial.print(pumpOn ? 1 : 0);
  Serial.print(F(",\"pump_run_sec\":"));
  Serial.print(pumpOn ? (millis() - pumpOnSince) / 1000UL : 0UL);
  Serial.print(F(",\"mode\":\""));
  Serial.print(autoMode ? F("AUTO") : F("MANUAL"));
  Serial.print(F("\",\"safety_ok\":"));
  Serial.print(safetyOK() ? 1 : 0);
  Serial.print(F(",\"hum_on\":"));
  Serial.print(humidityOn);
  Serial.print(F(",\"hum_off\":"));
  Serial.print(humidityOff);
  Serial.print(F(",\"soil_stop_above\":"));
  Serial.print(maxSoil);
  Serial.print(F(",\"temp_stop_below\":"));
  Serial.print(minTempC, 1);
  Serial.print(F(",\"water_stop_below\":"));
  Serial.print(minWater);
  Serial.print(F(",\"stop_reason\":"));
  Serial.print(stopReason);
  Serial.print(F(",\"lock_reason\":\""));
  Serial.print(stopReasonName(stopReason));
  Serial.print(F("\",\"sensor_ok\":"));
  Serial.print((sensorsReady && dhtOk && soilOk && waterOk) ? 1 : 0);
  Serial.print(F(",\"air_hum_warn_above\":"));
  Serial.print((float)humidityOff, 1);
  // Các trường dữ liệu khí hậu gửi lên Web & Discord: air_hum là Độ ẩm KK; soil là Độ ẩm đất
  Serial.print(F(",\"air_temp\":"));
  if (dhtOk && !isnan(airTempC)) Serial.print(airTempC, 1);
  else Serial.print(F("null"));
  Serial.print(F(",\"air_hum\":"));
  if (dhtOk && !isnan(airHumPct)) Serial.print(airHumPct, 1);
  else Serial.print(F("null"));
  Serial.print(F(",\"dht_ok\":"));
  Serial.print(dhtOk ? 1 : 0);
  Serial.println(F("}"));
}

// =========================================================================================
// PHẦN 10: BỘ XỬ LÝ LỆNH ĐIỀU KHIỂN TỪ WEB DASHBOARD GỬI XUỐNG
// =========================================================================================
// Phân tích và thực thi các câu lệnh văn bản từ giao diện Web qua cổng USB Serial.
void processCommand(char *cmd) {
  // Cắt bỏ khoảng trắng thừa ở đầu chuỗi
  while (*cmd == ' ' || *cmd == '\t') cmd++;

  int len = strlen(cmd);
  // Cắt bỏ khoảng trắng và ký tự xuống dòng ở cuối chuỗi
  while (len > 0 && (cmd[len - 1] == ' ' || cmd[len - 1] == '\t' || cmd[len - 1] == '\r' || cmd[len - 1] == '\n')) {
    cmd[--len] = '\0';
  }

  if (cmd[0] == '\0') return;

  // Chuyển toàn bộ ký tự sang chữ IN HOA để nhận diện lệnh không phân biệt hoa/thường
  for (char *p = cmd; *p; p++) {
    if (*p >= 'a' && *p <= 'z') *p = *p - 'a' + 'A';
  }

  // 1. LỆNH KIỂM TRA KẾT NỐI (PING / STATUS)
  if (strcmp(cmd, "PING") == 0 || strcmp(cmd, "STATUS") == 0 || strcmp(cmd, "ECHO_PING") == 0) {
    Serial.println(F("[ACK] PONG"));
    sendJSON();
    return;
  }

  // 2. LỆNH BẬT BƠM THỦ CÔNG: Tuân thủ khóa an toàn phần cứng (cảm biến/nhiệt độ/đất/nước); RH chỉ điều khiển AUTO.
  if (strcmp(cmd, "PUMP_ON") == 0 || strcmp(cmd, "START") == 0 || strcmp(cmd, "1") == 0) {
    if (autoMode) {
      Serial.println(F("[ACK] REFUSED: SWITCH TO MANUAL MODE FIRST"));
      return;
    }
    if (!safetyOK()) {
      manualRequestedOn = false;
      setPump(false);
      printRefusedReason(); // Báo rõ lý do từ chối bật bơm lên Web & Discord
    } else {
      manualRequestedOn = true;
      setPump(true);
      if (pumpOn) Serial.println(F("[EVT:MANUAL_START] Pump ON continuously until STOP/safety."));
      else Serial.println(F("[EVT:WAIT_RESTART] START queued; automatic ON after relay 2.5s debounce."));
    }
    return;
  }

  // 3. LỆNH TẮT BƠM KHẨN CẤP: Ngắt máy bơm ngay lập tức
  if (strcmp(cmd, "PUMP_OFF") == 0 || strcmp(cmd, "STOP") == 0 || strcmp(cmd, "0") == 0) {
    manualRequestedOn = false;
    setPump(false);
    Serial.println(F("[EVT:MANUAL_STOP] Pump STOPPED by manual command."));
    return;
  }

  // 4. LỆNH CHUYỂN ĐỔI CHẾ ĐỘ: TỰ ĐỘNG (AUTO) hoặc THỦ CÔNG (MANUAL)
  if (strcmp(cmd, "MODE_AUTO") == 0 || strcmp(cmd, "AUTO") == 0) {
    manualRequestedOn = false;
    autoMode = true;
    Serial.println(F("[ACK] MODE SWITCHED TO AUTO"));
    return;
  }
  if (strcmp(cmd, "MODE_MANUAL") == 0 || strcmp(cmd, "MANUAL") == 0) {
    manualRequestedOn = pumpOn;
    autoMode = false;
    Serial.println(F("[ACK] MODE SWITCHED TO MANUAL"));
    return;
  }

  // 5. Các lệnh cấu hình hiệp phun cũ KHÔNG còn được hỗ trợ.
  if (strncmp(cmd, "DUR:", 4) == 0 || strncmp(cmd, "SOAK:", 5) == 0
      || strncmp(cmd, "CD:", 3) == 0 || strcmp(cmd, "RESET_ALERT") == 0
      || strcmp(cmd, "CLEAR_ALERT") == 0) {
    Serial.println(F("[ACK] UNSUPPORTED: CONTINUOUS_MISTING_MODE"));
    return;
  }

  // 6. LỆNH CÀI ĐẶT NGƯỠNG ĐỘ ẨM KHÔNG KHÍ BẬT/TẮT (BOUNDS:min,max), mặc định BOUNDS:60,70
  if (strncmp(cmd, "BOUNDS:", 7) == 0) {
    char *comma = strchr(cmd + 7, ',');
    if (comma) {
      *comma = '\0';
      int onVal = atoi(cmd + 7);
      int offVal = atoi(comma + 1);
      if (onVal > 0 && offVal > onVal && offVal <= 100) {
        humidityOn = onVal;
        humidityOff = offVal;
        Serial.print(F("[ACK] AIR RH BOUNDS SET TO "));
        Serial.print(humidityOn);
        Serial.print(F("% - "));
        Serial.print(humidityOff);
        Serial.println(F("%"));
      }
    }
    return;
  }

  // 7. LỆNH GIẢ LẬP MỰC NƯỚC ĐỂ TEST BẢO VỆ CẠN NƯỚC (MOCK_WATER:xx; truyền -1 để quay lại cảm biến thật)
  if (strncmp(cmd, "MOCK_WATER:", 11) == 0) {
    mockWaterPct = atoi(cmd + 11);
    Serial.print(F("[ACK] MOCK WATER SET TO "));
    Serial.println(mockWaterPct);
    return;
  }


}

// =========================================================================================
// PHẦN 11: HÀM ĐỌC DỮ LIỆU SERIAL KHÔNG GÂY ĐỨNG MÁY (NON-BLOCKING SERIAL READER)
// =========================================================================================
// Gom từng ký tự nhận được vào bộ đệm cho tới khi gặp ký tự xuống dòng (\n hoặc \r) mới xử lý.
void checkSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (commandIndex > 0) {
        commandBuffer[commandIndex] = '\0';
        processCommand(commandBuffer);
        commandIndex = 0;
      }
    } else {
      if (commandIndex < sizeof(commandBuffer) - 1) {
        commandBuffer[commandIndex++] = c;
      }
    }
  }
}

// =========================================================================================
// PHẦN 12: HIỂN THỊ MÀN HÌNH LCD 16x2 & CƠ CHẾ TỰ PHỤC HỒI CHỐNG NHIỄU (SELF-HEALING)
// =========================================================================================
void drawLCDContent() {
  // Luân phiên lật trang mỗi 2 giây giữa Trang Trạng thái (0) và Trang Khí hậu DHT11 (1).
  // Xóa trắng cả 2 dòng trước khi in nội dung mới để không bị lưu ảnh ký tự cũ.
  lcd.setCursor(0, 0);
  lcd.print(F("                "));
  lcd.setCursor(0, 1);
  lcd.print(F("                "));

  // TRANG 1: Hiển thị Nhiệt độ và Độ ẩm không khí từ DHT11
  if (lcdPage == 1) {
    lcd.setCursor(0, 0);
    lcd.print(F("Temp: "));
    if (dhtOk && !isnan(airTempC)) lcd.print(airTempC, 1);
    else lcd.print(F("--.-"));
    lcd.print(F(" C"));
    lcd.setCursor(0, 1);
    lcd.print(F("Air RH: "));
    if (dhtOk && !isnan(airHumPct)) lcd.print(airHumPct, 1);
    else lcd.print(F("--.-"));
    lcd.print(F(" %"));
    return;
  }

  // TRANG 0 - Dòng 1: Hiển thị Độ ẩm đất (S) và Mực nước bình chứa (W)
  lcd.setCursor(0, 0);
  lcd.print(F("S:"));
  if (soilOk && soilPercent >= 0) {
    lcd.print(soilPercent);
    lcd.print(F("%"));
  } else {
    lcd.print(F("--%"));
  }
  lcd.print(F(" W:"));
  if (waterOk && waterPercent >= 0) {
    lcd.print(waterPercent);
    lcd.print(F("% "));
  } else {
    lcd.print(F("--% "));
  }

  // TRANG 0 - Dòng 2: Hiển thị Lý do khóa an toàn ưu tiên hoặc Trạng thái hoạt động của Bơm
  lcd.setCursor(0, 1);
  byte reason = getStopReason();
  if (reason == STOP_SENSORS) {
    lcd.print(F("WAIT: SENSORS"));
  } else if (reason == STOP_DHT) {
    lcd.print(F("LOCK: DHT ERROR"));
  } else if (reason == STOP_TEMP) {
    lcd.print(F("LOCK: TEMP<18C"));
  } else if (reason == STOP_SOIL) {
    lcd.print(F("LOCK: SOIL>65%"));
  } else if (reason == STOP_WATER) {
    lcd.print(F("LOCK: WATER<20%"));
  } else if (reason == STOP_RH) {
    lcd.print(F("STOP: RH>="));
    lcd.print(humidityOff);
    lcd.print(F("%"));
  } else {
    // Hoạt động bình thường: Hiển thị trạng thái Bơm ON/OFF và chế độ AUTO/MAN
    lcd.print("Pump: ");
    lcd.print(pumpOn ? "ON " : "OFF");
    lcd.print(autoMode ? " [AUTO]" : " [MAN] ");
  }
}

// Khởi tạo lại thanh ghi màn hình LCD 16x2 ngay sau khi Relay đóng/ngắt để xóa lỗi loạn chữ do xung điện từ
void recoverLCD() {
  lcd.begin(16, 2);
  lcd.clear();
  drawLCDContent();
}

byte lcdHealthCounter = 0;

void updateLCD() {
  lcdHealthCounter++;
  // Cứ sau 4 lần lật trang (8 giây), làm mới nhẹ lại cấu hình LCD để dọn sạch nhiễu điện tích tụ
  if (lcdHealthCounter >= 4) {
    lcdHealthCounter = 0;
    lcd.begin(16, 2);
  }

  lcdPage = (lcdPage == 0) ? 1 : 0;
  drawLCDContent();
}

// =========================================================================================
// PHẦN 13: HÀM KHỞI ĐỘNG HỆ THỐNG (CHẠY 1 LẦN KHI CẤP ĐIỆN)
// =========================================================================================
void setup() {
  // Gán mức HIGH trước khi đặt pinMode OUTPUT để Relay kích LOW không bị nháy bật bơm lúc mới cắm điện
  digitalWrite(relayPin, RELAY_OFF);
  pinMode(relayPin, OUTPUT);

  // Khởi tạo giao tiếp Serial ở tốc độ 9600 baud
  Serial.begin(9600);
  dht.begin(); // Khởi động cảm biến DHT11 trên chân A1

  // Cấu hình các chân đọc cảm biến Analog
  pinMode(soilPin,  INPUT);
  pinMode(waterPin, INPUT);

  // Khởi động màn hình chào trên LCD 16x2
  lcd.begin(16, 2);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SMART MISTING");
  lcd.setCursor(0, 1);
  lcd.print("SYSTEM READY");

  delay(150); // Hiển thị màn hình chào 0.15 giây, phản hồi siêu tốc khi cắm cổng COM
  lcd.clear();

  // Đọc và gửi dữ liệu cảm biến 
  readSensors();

  Serial.println(F("[SYSTEM READY] Smart Misting Controller online @ 9600 baud. Relay Pin D8 Active LOW."));
  sendJSON();
}

// =========================================================================================
// PHẦN 14: VÒNG LẶP CHÍNH (CHẠY LIÊN TỤC ĐA NHIỆM)
// =========================================================================================
void loop() {
  unsigned long currentMillis = millis();

  // Nhiệm vụ 1: Liên tục kiểm tra và xử lý lệnh điều khiển từ Web qua USB Serial
  checkSerial();

  // Nhiệm vụ 2: Đọc cảm biến và đánh giá logic điều khiển phun sương định kỳ (mỗi 500ms)
  if (currentMillis - lastSensorRead >= sensorInterval) {
    lastSensorRead = currentMillis;
    readSensors();
    controlPump();
  }

  // Nhiệm vụ 3: Truyền gói tin JSON lên Web Dashboard & Discord định kỳ (mỗi 1000ms)
  if (currentMillis - lastJSONSend >= jsonInterval) {
    lastJSONSend = currentMillis;
    sendJSON();
  }

  // Nhiệm vụ 4: Lật trang hiển thị trên màn hình LCD 16x2 định kỳ (mỗi 2000ms)
  if (currentMillis - lastLCDUpdate >= lcdInterval) {
    lastLCDUpdate = currentMillis;
    updateLCD();
  }
}