#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// --- Network Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- Hardware Setup ---
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17

// Explicitly use UART1 for the C6
HardwareSerial PzemSerial(1); 
PZEM004Tv30 pzem(PzemSerial, PZEM_RX_PIN, PZEM_TX_PIN);

AsyncWebServer server(80);

void setup() {
  // 1. Force hardware serial initialization BEFORE passing to the library
  PzemSerial.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  MDNS.begin("energymonitor");

  // --- Normal Telemetry Route ---
  server.on("/telemetry", HTTP_GET, [](AsyncWebServerRequest *request){
    StaticJsonDocument<200> doc;
    doc["voltage"] = pzem.voltage();
    doc["power"] = pzem.power();
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // --- NEW: Debug Route ---
  server.on("/debug", HTTP_GET, [](AsyncWebServerRequest *request){
    float testV = pzem.voltage();
    String msg;
    if (isnan(testV)) {
      msg = "ERROR: NaN. UART communication is completely dead. Check wiring or 5V power.";
    } else if (testV == 0.0) {
      msg = "SUCCESS: UART works! But AC voltage reads 0. Check your AC mains connection to the PZEM.";
    } else {
      msg = "SUCCESS: UART works and AC is live! Voltage: " + String(testV) + "V";
    }
    request->send(200, "text/plain", msg);
  });

  server.begin();
}

void loop() {
  // Empty for this test
}