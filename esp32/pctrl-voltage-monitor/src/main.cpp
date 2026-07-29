#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <secrets.h>

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;
// String nodeAlertUrl = "http://192.168.29.86:4000/api/esp32/alert";
const char *serverHostname = HOSTNAME;
const int serverPort = PORT;
String cachedServerIP = "";

// --- Hardware Setup ---
#define PZEM_TX_PIN 16
#define PZEM_RX_PIN 17
PZEM004Tv30 pzem(Serial1, PZEM_RX_PIN, PZEM_TX_PIN);

AsyncWebServer server(80);

// --- State Variables ---
float v = 0.0, i = 0.0, p = 0.0, e = 0.0, f = 0.0, pf = 0.0;
unsigned long lastReadTime = 0;

enum GridState { NORMAL, BROWNOUT, POWERCUT };
GridState gridState = NORMAL;

float prev_voltages[5] = {0, 0, 0, 0, 0};

float mains_last_hour[60] = {-1};
bool mains_last_min[30] = {false};
float mains_last_day[24] = {-1};

float uptime_last_day = -1;

int day_counter = 0;
int hour_counter = 0;
int min_counter = 0;
int httpCode= -6969;

bool uptime_loop_bled = false;
int last_alert_http_code = 0;

const float BROWNOUT_VOLTAGE = 200.0;
const float RECOVERY_VOLTAGE = 210.0;

void sendAlertWebhook(GridState state, float currentVoltage) {
  if (WiFi.status() == WL_CONNECTED) {
    int attempts = 2;
    while (attempts > 0) {
      if (cachedServerIP == "") {
        Serial.print("Resolving server mDNS: ");
        Serial.print(serverHostname);
        Serial.println(".local");

        IPAddress ip = MDNS.queryHost(serverHostname);

        if (ip.toString() != "0.0.0.0") {
          cachedServerIP = ip.toString();
          Serial.println("Success! Server IP locked to: " + cachedServerIP);
        } else {
          Serial.println("❌ mDNS resolution failed! Cannot send alert.");
          return; // Abort sending
        }
      }
      String url = "http://" + cachedServerIP + ":" + String(serverPort) +
                  "/api/esp32/alert";

      HTTPClient http;
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-esp32-secret", ESP32_SECRET_KEY);

      String eventName = (state == POWERCUT)   ? "POWERCUT"
                        : (state == BROWNOUT) ? "BROWNOUT"
                                              : "NORMAL";

      StaticJsonDocument<128> doc;
      doc["event"] = eventName;
      doc["voltage"] = currentVoltage;

      String payload;
      serializeJson(doc, payload);
      httpCode = http.POST(payload);
      if (httpCode > 0) {
        Serial.printf("✅ Alert sent successfully (HTTP %d)\n", httpCode);
        break; // Success! Exit the retry loop.
        Serial.printf("❌ Failed to reach server (Error %d). Wiping cached IP.\n", httpCode);
        cachedServerIP = ""; // Clear the bad IP
        attempts--; // Loop will restart and trigger mDNS resolution automatically
      }
    }
  }
}
void evaluateGridState(float currentVoltage) {
  GridState newState = gridState;
  bool flag = true;
  if (currentVoltage <= 2.0) {
    for (int i = 0; i < 5; i++) {
      if (prev_voltages[i] > 2.0) {
        flag = false;
      }
    }
    if (flag)
      newState = POWERCUT;
  } else if (currentVoltage < BROWNOUT_VOLTAGE) {
    for (int i = 0; i < 5; i++) {
      if (prev_voltages[i] > BROWNOUT_VOLTAGE || prev_voltages[i] < 2.0) {
        flag = false;
      }
    }
    if (flag)
      newState = BROWNOUT;
  } else if (currentVoltage >= RECOVERY_VOLTAGE) {
    for (int i = 0; i < 5; i++) {
      if (prev_voltages[i] < RECOVERY_VOLTAGE) {
        flag = false;
      }
    }
    if (flag)
      newState = NORMAL;
  }
  for (int i = 0; i < 4; i++) {
    prev_voltages[i] = prev_voltages[i + 1];
  }
  prev_voltages[4] = currentVoltage;

  if (newState != gridState) {
    sendAlertWebhook(newState, currentVoltage);
    gridState = newState;
  }
  bool mains_up = gridState == NORMAL;

  mains_last_min[min_counter] = mains_up;
  min_counter = (min_counter + 1) % 30;
  if (min_counter == 0) {
    int count = 0;
    for (int i = 0; i < 30; i++) {
      if (mains_last_min[i] == 1)
        count++;
    }
    mains_last_hour[hour_counter] = count / 30.0;
    hour_counter = (hour_counter + 1) % 60;
    if (hour_counter == 0) {
      float sum = 0;
      for (int i = 0; i < 60; i++) {
        sum += mains_last_hour[i];
      }

      mains_last_day[day_counter] = sum / 60.0;
      if (uptime_loop_bled) {
        float last_day_sum = 0;
        for (int i = 0; i < 24; i++) {
          if (mains_last_day[i] != -1)
            last_day_sum += mains_last_day[i];
        }
        uptime_last_day = last_day_sum / 24.0;
      }

      day_counter = (day_counter + 1) % 24;
      if (day_counter == 0 && !uptime_loop_bled) {
        float sum = 0;
        for (int i = 0; i < 24; i++) {
          if (mains_last_day[i] != -1)
            sum += mains_last_day[i];
        }
        uptime_last_day = sum / 24.0;
        uptime_loop_bled = true;
      }
    }
  }
}
void readPZEM() {

  // Update globals safely
  v = pzem.voltage();
  i = pzem.current();
  p = pzem.power();
  e = pzem.energy();
  f = pzem.frequency();
  pf = pzem.pf();

  if (isnan(v))
    v = 0;
  if (isnan(i))
    i = 0;
  if (isnan(p))
    p = 0;
  if (isnan(e))
    e = 0;
  if (isnan(f))
    f = 0;
  if (isnan(pf))
    pf = 0;

  evaluateGridState(v);
}

void setup() {
  Serial.begin(115200);
  WiFi.enableIPv6();
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  if (MDNS.begin("energymonitor")) {
    Serial.println("MDNS responder started");
  } else {
    Serial.println("Error setting up MDNS responder!");
  }
  Serial.println("\nWiFi Connected. IP: " + WiFi.localIP().toString());

  // --- Async Web Server Route ---
  server.on("/telemetry", HTTP_GET, [](AsyncWebServerRequest *request) {
    StaticJsonDocument<128> doc;
    doc["voltage"] = v;
    doc["current"] = i;
    doc["power"] = p;
    doc["energy"] = e;
    doc["frequency"] = f;
    doc["pf"] = pf;
    doc["gridState"] = (gridState == NORMAL)     ? "NORMAL"
                       : (gridState == BROWNOUT) ? "BROWNOUT"
                                                 : "POWERCUT";
    if (uptime_last_day == -1) {
      doc["uptime_24h"] = nullptr;
    } else {
      doc["uptime_24h"] = uptime_last_day;
    }
    doc["last_code"]= httpCode;
    doc["server_ip"]=cachedServerIP;
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });
  Serial1.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);

  server.begin();
}

void loop() {
  if (millis() - lastReadTime > 2000) {
    readPZEM();
    lastReadTime += 2000;
  }
}
