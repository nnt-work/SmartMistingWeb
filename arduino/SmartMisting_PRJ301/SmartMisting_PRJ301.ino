/*
 * =========================================================================================
 * SMART MISTING SYSTEM - ARDUINO UNO FIRMWARE (V8.1 - CONTINUOUS MISTING & SCADA PROTOCOL)
 * Course: PRJ301 - IoT Agriculture Automation System
 * Hardware: Arduino Uno R3, 5V Relay (D8, Active LOW), LCD 16x2, Soil (A0), Water (A2), DHT11 (A1)
 * Protocol: USB Serial / Web Serial @ 9600 Baud (8N1 JSON telemetry stream at 1 Hz)
 * Control Logic:
 *   - AUTO Mode: Air RH < 60% starts misting; 60% <= RH < 70% preserves state; RH >= 70% stops.
 *   - Priority Safety Cutoffs: Temp < 18.0 C or > 38.0 C, Soil > 65%, Water Reservoir < 20%.
 *   - Sensor Fault Interlock: DHT11 stale timeout (7s) or analog open-circuit stops pump immediately.
 *   - Relay: Active LOW on Pin D8 (Output LOW = Relay ON, Output HIGH = Relay OFF).
 * =========================================================================================
 * PIN ASSIGNMENTS:
 *   1. Soil Moisture (Analog): AO -> A0, VCC -> 5V, GND -> GND (Dry air: ~980, Submerged: ~300)
 *   2. Water Level (Analog):   SIG -> A2, VCC -> 5V, GND -> GND (Dry: <= 80, Full: ~500)
 *   3. Relay Module (Digital): IN -> D8 (Active LOW), COM/NO wired in series with 5V misting pump
 *   4. LCD 16x2 (Parallel):    RS=12, EN=11, D4=5, D5=4, D6=3, D7=2, RW=GND, VSS=GND, VDD=5V
 *   5. DHT11 Sensor (Digital): DATA -> A1, VCC -> 5V, GND -> GND
 * =========================================================================================
 */

#include <LiquidCrystal.h>
#include <DHT.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

// Pin definitions
const byte soilPin  = A0;
const byte waterPin = A2;
const byte relayPin = 8;

#define DHT_PIN A1
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Relay polarity: Active LOW
const byte RELAY_ON  = LOW;
const byte RELAY_OFF = HIGH;

// LiquidCrystal display instance (RS, EN, D4, D5, D6, D7)
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

// Sensor calibration constants
const int soilDry = 980;
const int soilWet = 300;

const int waterEmpty = 80;
const int waterFull  = 500;

// Safety and automation thresholds
int humidityOn   = 60;
int humidityOff  = 70;
const float minTempC = 18.0;
const float maxTempC = 38.0;
const int maxSoil = 65;
const int minWater = 20;

// Real-time telemetry state
int soilRaw     = 0;
int soilPercent = 0;
bool soilOk     = false;

int waterRaw     = 0;
int waterPercent = 0;
bool waterOk     = false;

int mockWaterPct = -1;

float airTempC = NAN;
float airHumPct = NAN;
bool dhtOk = false;
unsigned long lastDHTReadTime = 0;
unsigned long lastDHTSuccessTime = 0;
const unsigned long DHT_READ_INTERVAL = 1500UL;
const unsigned long DHT_STALE_INTERVAL = 7000UL;

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

  if (lastDHTSuccessTime == 0 || now - lastDHTSuccessTime >= DHT_STALE_INTERVAL) {
    dhtOk = false;
    airTempC = NAN;
    airHumPct = NAN;
  }
}

// Actuation and control state
bool pumpOn            = false;
bool autoMode          = true;
bool manualRequestedOn = false;
bool sensorsReady      = false;

unsigned long manualPulseMs    = 0;
unsigned long manualPulseStart = 0;

unsigned long lastSensorRead = 0;
unsigned long lastLCDUpdate  = 0;
unsigned long lastJSONSend   = 0;

const unsigned long sensorInterval = 500;
const unsigned long lcdInterval    = 2000;
const unsigned long jsonInterval   = 1000;

byte lcdPage = 0;

char commandBuffer[48];
byte commandIndex = 0;
bool commandOverflow = false;

// Stop and interlock reason codes
const byte STOP_NONE    = 0;
const byte STOP_SENSORS = 1;
const byte STOP_DHT     = 2;
const byte STOP_TEMP    = 3;
const byte STOP_SOIL    = 4;
const byte STOP_WATER   = 5;
const byte STOP_RH      = 6;

byte getStopReason() {
  if (!sensorsReady || !soilOk || !waterOk) return STOP_SENSORS;
  if (!dhtOk || isnan(airTempC) || isnan(airHumPct)) return STOP_DHT;
  if (airTempC < minTempC || airTempC > maxTempC) return STOP_TEMP;
  if (soilPercent > maxSoil) return STOP_SOIL;
  if (waterPercent < minWater) return STOP_WATER;
  if (autoMode && airHumPct >= humidityOff) return STOP_RH;
  return STOP_NONE;
}

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

bool safetyOK() {
  return getStopReason() == STOP_NONE;
}

void printStopReason() {
  switch (getStopReason()) {
    case STOP_SENSORS:
      Serial.println(F("[EVT:SAFETY_STOP_SENSORS] Sensors not ready. Pump stopped."));
      break;
    case STOP_DHT:
      Serial.println(F("[EVT:SAFETY_STOP_DHT] DHT11 missing or stale (Check A1). Pump stopped."));
      break;
    case STOP_TEMP:
      Serial.println(F("[EVT:SAFETY_STOP_TEMP] Temperature outside safe limits (18.0 - 38.0 C). Pump stopped."));
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

void printRefusedReason() {
  switch (getStopReason()) {
    case STOP_SENSORS:
      Serial.println(F("[EVT:REFUSED_SENSORS] Sensors not ready. Pump blocked."));
      break;
    case STOP_DHT:
      Serial.println(F("[EVT:REFUSED_DHT] DHT11 missing or stale. Check A1. Pump blocked."));
      break;
    case STOP_TEMP:
      Serial.println(F("[EVT:REFUSED_TEMP] Temperature cutoff (<18C or >38C). Pump blocked."));
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

void recoverLCD();

unsigned long lastPumpSwitchTime = 0;
unsigned long pumpOnSince = 0;
const unsigned long pumpSwitchCooldown = 2500;

void setPump(bool on) {
  if (on && !safetyOK()) {
    on = false;
  }

  if (pumpOn != on) {
    if (on && millis() - lastPumpSwitchTime < pumpSwitchCooldown && lastPumpSwitchTime > 0) {
      return;
    }

    pumpOn = on;
    lastPumpSwitchTime = millis();
    if (pumpOn) pumpOnSince = millis();

    digitalWrite(relayPin, pumpOn ? RELAY_ON : RELAY_OFF);
    delay(40);
    recoverLCD();
  }
}

void readSensors() {
  pinMode(soilPin, INPUT);
  digitalWrite(soilPin, LOW);
  analogRead(soilPin);

  long soilSum = 0;
  for (int i = 0; i < 20; i++) {
    soilSum += analogRead(soilPin);
    delayMicroseconds(100);
  }
  soilRaw = (int)(soilSum / 20);

  if (soilRaw >= 1018 || soilRaw <= 15) {
    soilOk = false;
    soilPercent = -1;
  } else {
    soilOk = true;
    soilPercent = map(soilRaw, soilDry, soilWet, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);
  }

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
  updateDHT();
}

void controlPump() {
  if (!safetyOK()) {
    manualRequestedOn = false;
    manualPulseMs = 0;
    if (pumpOn) {
      printStopReason();
      setPump(false);
    }
    return;
  }

  if (!autoMode) {
    if (manualPulseMs > 0 && (millis() - manualPulseStart >= manualPulseMs)) {
      manualPulseMs = 0;
      manualRequestedOn = false;
      setPump(false);
      Serial.println(F("[EVT:PULSE_COMPLETE] Manual misting pulse finished."));
      return;
    }
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
}

void sendJSON() {
  byte stopReason = getStopReason();

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

void processCommand(char *cmd) {
  while (*cmd == ' ' || *cmd == '\t') cmd++;

  int len = strlen(cmd);
  while (len > 0 && (cmd[len - 1] == ' ' || cmd[len - 1] == '\t' || cmd[len - 1] == '\r' || cmd[len - 1] == '\n')) {
    cmd[--len] = '\0';
  }

  if (cmd[0] == '\0') return;

  for (char *p = cmd; *p; p++) {
    if (*p >= 'a' && *p <= 'z') *p = *p - 'a' + 'A';
  }

  // 1. Connection check (PING / STATUS)
  if (strcmp(cmd, "PING") == 0 || strcmp(cmd, "STATUS") == 0 || strcmp(cmd, "ECHO_PING") == 0) {
    Serial.println(F("[ACK] PONG"));
    sendJSON();
    return;
  }

  // 2. Manual Start command (Continuous)
  if (strcmp(cmd, "PUMP_ON") == 0 || strcmp(cmd, "START") == 0 || strcmp(cmd, "1") == 0) {
    if (autoMode) {
      Serial.println(F("[ACK] REFUSED: SWITCH TO MANUAL MODE FIRST"));
      return;
    }
    if (!safetyOK()) {
      manualRequestedOn = false;
      manualPulseMs = 0;
      setPump(false);
      printRefusedReason();
    } else {
      manualPulseMs = 0;
      manualRequestedOn = true;
      setPump(true);
      if (pumpOn) Serial.println(F("[EVT:MANUAL_START] Pump ON continuously until STOP/safety."));
      else Serial.println(F("[EVT:WAIT_RESTART] START queued; automatic ON after relay debounce."));
    }
    return;
  }

  // 3. Manual Timed Pulse command (RUN:<seconds>)
  if (strncmp(cmd, "RUN:", 4) == 0) {
    if (autoMode) {
      Serial.println(F("[EVT:REFUSED] RUN command rejected in AUTO mode. Switch to MANUAL."));
      return;
    }
    if (!safetyOK()) {
      manualRequestedOn = false;
      manualPulseMs = 0;
      setPump(false);
      printRefusedReason();
      return;
    }
    int sec = atoi(cmd + 4);
    if (sec > 0) {
      manualPulseMs = (unsigned long)sec * 1000UL;
      manualPulseStart = millis();
      manualRequestedOn = true;
      setPump(true);
      Serial.print(F("[ACK] MANUAL RUN STARTED FOR "));
      Serial.print(sec);
      Serial.println(F(" SECONDS"));
    }
    return;
  }

  // 4. Manual Stop command
  if (strcmp(cmd, "PUMP_OFF") == 0 || strcmp(cmd, "STOP") == 0 || strcmp(cmd, "0") == 0) {
    manualRequestedOn = false;
    manualPulseMs = 0;
    setPump(false);
    Serial.println(F("[EVT:MANUAL_STOP] Pump STOPPED by manual command."));
    return;
  }

  // 5. Operating mode switch (AUTO / MANUAL)
  if (strcmp(cmd, "MODE_AUTO") == 0 || strcmp(cmd, "AUTO") == 0) {
    manualRequestedOn = false;
    manualPulseMs = 0;
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

  // 6. Legacy interval cycle commands
  if (strncmp(cmd, "DUR:", 4) == 0 || strncmp(cmd, "SOAK:", 5) == 0
      || strncmp(cmd, "CD:", 3) == 0 || strcmp(cmd, "RESET_ALERT") == 0
      || strcmp(cmd, "CLEAR_ALERT") == 0) {
    Serial.println(F("[ACK] UNSUPPORTED: CONTINUOUS_MISTING_MODE"));
    return;
  }

  // 7. Dynamic RH Bounds configuration (BOUNDS:min,max)
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

  // 8. Mock water level for unit testing
  if (strncmp(cmd, "MOCK_WATER:", 11) == 0) {
    mockWaterPct = atoi(cmd + 11);
    Serial.print(F("[ACK] MOCK WATER SET TO "));
    Serial.println(mockWaterPct);
    return;
  }
}

void checkSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (commandOverflow) {
        commandOverflow = false;
        commandIndex = 0;
      } else if (commandIndex > 0) {
        commandBuffer[commandIndex] = '\0';
        processCommand(commandBuffer);
        commandIndex = 0;
      }
    } else {
      if (commandOverflow) {
        // Discard rest of oversized line
      } else if (commandIndex < sizeof(commandBuffer) - 1) {
        commandBuffer[commandIndex++] = c;
      } else {
        commandOverflow = true;
        commandIndex = 0;
      }
    }
  }
}

void drawLCDContent() {
  lcd.setCursor(0, 0);
  lcd.print(F("                "));
  lcd.setCursor(0, 1);
  lcd.print(F("                "));

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
    lcd.print("Pump: ");
    lcd.print(pumpOn ? "ON " : "OFF");
    lcd.print(autoMode ? " [AUTO]" : " [MAN] ");
  }
}

void recoverLCD() {
  lcd.begin(16, 2);
  lcd.clear();
  drawLCDContent();
}

byte lcdHealthCounter = 0;

void updateLCD() {
  lcdHealthCounter++;
  if (lcdHealthCounter >= 4) {
    lcdHealthCounter = 0;
    lcd.begin(16, 2);
  }

  lcdPage = (lcdPage == 0) ? 1 : 0;
  drawLCDContent();
}

void setup() {
  digitalWrite(relayPin, RELAY_OFF);
  pinMode(relayPin, OUTPUT);

  Serial.begin(9600);
  dht.begin();

  pinMode(soilPin,  INPUT);
  pinMode(waterPin, INPUT);

  lcd.begin(16, 2);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SMART MISTING");
  lcd.setCursor(0, 1);
  lcd.print("SYSTEM READY");

  delay(150);
  lcd.clear();

  readSensors();

  Serial.println(F("[SYSTEM READY] Smart Misting Controller online @ 9600 baud. Relay Pin D8 Active LOW."));
  sendJSON();
}

void loop() {
  unsigned long currentMillis = millis();

  checkSerial();

  if (currentMillis - lastSensorRead >= sensorInterval) {
    lastSensorRead = currentMillis;
    readSensors();
    controlPump();
  }

  if (currentMillis - lastJSONSend >= jsonInterval) {
    lastJSONSend = currentMillis;
    sendJSON();
  }

  if (currentMillis - lastLCDUpdate >= lcdInterval) {
    lastLCDUpdate = currentMillis;
    updateLCD();
  }
}
