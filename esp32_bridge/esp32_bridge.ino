/**
 * Mini Game Console - ESP32 Classic Bluetooth Bridge (Bluepad32)
 * Target Hardware: ESP32-WROOM-32 / ESP32-DevKitC (Classic BT required; NOT ESP32-S3)
 * Arduino Core: esp32 + Bluepad32 board package (https://raw.githubusercontent.com/ricardoquesada/esp32-arduino-lib-builder/master/bluepad32_files/package_esp32_bluepad32_index.json)
 * Dependencies: WebSockets by Markus Sattler (links2004), ArduinoJson by Benoit Blanchon
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Bluepad32.h>
#include "esp_bt_main.h"
#include "esp_bt_device.h"

// WiFi AP Credentials
static const char* WIFI_SSID = "MiniConsole";
static const char* WIFI_PASS = "12345678";
static const uint16_t WS_PORT = 81;

// Maximum 4 DualShock 3 / Sixaxis controllers
static const int MAX_PADS = 4;
ControllerPtr myControllers[MAX_PADS] = { nullptr, nullptr, nullptr, nullptr };

// Optional MAC allowlist (set ENFORCE_ALLOWLIST = true to restrict connections)
static const bool ENFORCE_ALLOWLIST = false;
static const uint8_t ALLOWED_MACS[][6] = {
    { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x01 },
    { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x02 },
    { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x03 },
    { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x04 }
};

WebSocketsServer webSocket(WS_PORT);
unsigned long lastStreamMs = 0;
static const unsigned long STREAM_INTERVAL_MS = 16; // ~60 Hz (16.6 ms)

// Button Bitmask Definitions (16-bit)
enum PadButtons : uint16_t {
    BTN_CROSS    = (1 << 0),  // 0x0001
    BTN_CIRCLE   = (1 << 1),  // 0x0002
    BTN_SQUARE   = (1 << 2),  // 0x0004
    BTN_TRIANGLE = (1 << 3),  // 0x0008
    BTN_L1       = (1 << 4),  // 0x0010
    BTN_R1       = (1 << 5),  // 0x0020
    BTN_L2_DIG   = (1 << 6),  // 0x0040
    BTN_R2_DIG   = (1 << 7),  // 0x0080
    BTN_SELECT   = (1 << 8),  // 0x0100
    BTN_START    = (1 << 9),  // 0x0200
    BTN_L3       = (1 << 10), // 0x0400
    BTN_R3       = (1 << 11), // 0x0800
    BTN_UP       = (1 << 12), // 0x1000
    BTN_DOWN     = (1 << 13), // 0x2000
    BTN_LEFT     = (1 << 14), // 0x4000
    BTN_RIGHT    = (1 << 15), // 0x8000
};
// Note: PS button is transmitted in bit 16 (0x10000) of uint32_t bitmask `b`
static const uint32_t BTN_PS = (1UL << 16);

void printLocalBtMac() {
    const uint8_t* mac = BP32.localBdAddress();
    Serial.printf("[BT] ESP32 Bluetooth Classic Master MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.println("[BT] Use SixaxisPairTool or sixpair to write this MAC to your DualShock 3 pads.");
}

void onConnectedController(ControllerPtr ctl) {
    for (int i = 0; i < MAX_PADS; i++) {
        if (myControllers[i] == nullptr) {
            ControllerProperties props = ctl->getProperties();
            Serial.printf("[BT] Controller connected to slot P%d | Model: %s | BT Addr: %02X:%02X:%02X:%02X:%02X:%02X\n",
                          i + 1, ctl->getModelName().c_str(),
                          props.btaddr[0], props.btaddr[1], props.btaddr[2],
                          props.btaddr[3], props.btaddr[4], props.btaddr[5]);

            myControllers[i] = ctl;
            // Set PS3 player indicator LED (bitmask: P1=0x01, P2=0x02, P3=0x04, P4=0x08)
            ctl->setPlayerLEDs(1 << i);
            // Brief connection greeting rumble
            ctl->playDualRumble(0, 180, 0x80, 0x40);
            return;
        }
    }
    Serial.println("[BT] All 4 player slots full! Rejecting additional controller.");
    ctl->disconnect();
}

void onDisconnectedController(ControllerPtr ctl) {
    for (int i = 0; i < MAX_PADS; i++) {
        if (myControllers[i] == ctl) {
            Serial.printf("[BT] Controller disconnected from slot P%d\n", i + 1);
            myControllers[i] = nullptr;

            // Notify connected browsers immediately of disconnect (bat: -1)
            char msg[96];
            snprintf(msg, sizeof(msg),
                     "{\"t\":\"pad\",\"p\":%d,\"lx\":0,\"ly\":0,\"rx\":0,\"ry\":0,\"l2\":0,\"r2\":0,\"b\":0,\"bat\":-1}",
                     i);
            webSocket.broadcastTXT(msg);
            break;
        }
    }
}

void handleBrowserCommand(uint8_t clientNum, uint8_t* payload, size_t length) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
        Serial.printf("[WS] JSON parse error: %s\n", err.c_str());
        return;
    }

    const char* type = doc["t"];
    if (!type) return;

    // Browser sends 1-based player index ("p": 1..4) or 0-based ("p": 0..3); support both safely
    int pRaw = doc["p"] | 1;
    int slot = (pRaw >= 1 && pRaw <= 4) ? (pRaw - 1) : constrain(pRaw, 0, 3);
    ControllerPtr ctl = myControllers[slot];
    if (!ctl || !ctl->isConnected()) return;

    if (strcmp(type, "rumble") == 0) {
        uint8_t weakMagnitude   = constrain((int)(doc["r"] | 128), 0, 255);
        uint8_t strongMagnitude = constrain((int)(doc["l"] | 128), 0, 255);
        uint16_t durationMs     = constrain((int)(doc["ms"] | 200), 10, 5000);
        ctl->playDualRumble(0, durationMs, weakMagnitude, strongMagnitude);
    } else if (strcmp(type, "led") == 0) {
        uint8_t ledMask = doc["mask"] | (1 << slot);
        ctl->setPlayerLEDs(ledMask & 0x0F);
        if (doc["r"].is<int>()) {
            ctl->setColorLED(doc["r"] | 0, doc["g"] | 128, doc["b"] | 255);
        }
    }
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("[WS] Client #%u disconnected\n", num);
            break;
        case WStype_CONNECTED: {
            IPAddress ip = webSocket.remoteIP(num);
            Serial.printf("[WS] Client #%u connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
            break;
        }
        case WStype_TEXT:
            handleBrowserCommand(num, payload, length);
            break;
        default:
            break;
    }
}

uint32_t buildButtonBitmask(ControllerPtr ctl) {
    uint32_t mask = 0;
    uint16_t btns = ctl->buttons();
    uint8_t dpad  = ctl->dpad();
    uint8_t misc  = ctl->miscButtons();

    // Bluepad32 standard button mapping for PS3:
    // BUTTON_A = Cross, BUTTON_B = Circle, BUTTON_X = Square, BUTTON_Y = Triangle
    if (btns & BUTTON_A)         mask |= BTN_CROSS;
    if (btns & BUTTON_B)         mask |= BTN_CIRCLE;
    if (btns & BUTTON_X)         mask |= BTN_SQUARE;
    if (btns & BUTTON_Y)         mask |= BTN_TRIANGLE;
    if (btns & BUTTON_SHOULDER_L) mask |= BTN_L1;
    if (btns & BUTTON_SHOULDER_R) mask |= BTN_R1;
    if (btns & BUTTON_TRIGGER_L)  mask |= BTN_L2_DIG;
    if (btns & BUTTON_TRIGGER_R)  mask |= BTN_R2_DIG;
    if (btns & BUTTON_THUMB_L)    mask |= BTN_L3;
    if (btns & BUTTON_THUMB_R)    mask |= BTN_R3;

    if (misc & MISC_BUTTON_SELECT) mask |= BTN_SELECT;
    if (misc & MISC_BUTTON_START)  mask |= BTN_START;
    if (misc & MISC_BUTTON_SYSTEM) mask |= BTN_PS;

    if (dpad & DPAD_UP)    mask |= BTN_UP;
    if (dpad & DPAD_DOWN)  mask |= BTN_DOWN;
    if (dpad & DPAD_LEFT)  mask |= BTN_LEFT;
    if (dpad & DPAD_RIGHT) mask |= BTN_RIGHT;

    return mask;
}

int8_t scaleAxisToInt8(int32_t rawAxis) {
    // Bluepad32 axes range from -511 to +512; scale to -127..+127
    int32_t scaled = (rawAxis * 127) / 512;
    return (int8_t)constrain(scaled, -127, 127);
}

uint8_t scaleTriggerToUint8(int32_t rawTrigger) {
    // Bluepad32 throttle/brake range from 0 to 1023; scale to 0..255
    int32_t scaled = (rawTrigger * 255) / 1023;
    return (uint8_t)constrain(scaled, 0, 255);
}

uint8_t scaleBatteryLevel(uint8_t rawBat) {
    // Bluepad32 battery is 0..255 (0=empty, 255=full); map to 0..5 bars
    if (rawBat == 0) return 3; // Default to 3 bars if controller doesn't report
    return (uint8_t)constrain((rawBat * 5) / 255, 1, 5);
}

void streamControllersAt60Hz() {
    unsigned long now = millis();
    if (now - lastStreamMs < STREAM_INTERVAL_MS) return;
    lastStreamMs = now;

    if (webSocket.connectedClients() == 0) return;

    char jsonBuf[128];
    for (int i = 0; i < MAX_PADS; i++) {
        ControllerPtr ctl = myControllers[i];
        if (ctl && ctl->isConnected()) {
            int8_t lx   = scaleAxisToInt8(ctl->axisX());
            int8_t ly   = scaleAxisToInt8(ctl->axisY());
            int8_t rx   = scaleAxisToInt8(ctl->axisRX());
            int8_t ry   = scaleAxisToInt8(ctl->axisRY());
            uint8_t l2  = scaleTriggerToUint8(ctl->brake());
            uint8_t r2  = scaleTriggerToUint8(ctl->throttle());
            uint32_t b  = buildButtonBitmask(ctl);
            uint8_t bat = scaleBatteryLevel(ctl->battery());

            if (l2 > 30) b |= BTN_L2_DIG;
            if (r2 > 30) b |= BTN_R2_DIG;

            int len = snprintf(jsonBuf, sizeof(jsonBuf),
                "{\"t\":\"pad\",\"p\":%d,\"lx\":%d,\"ly\":%d,\"rx\":%d,\"ry\":%d,\"l2\":%u,\"r2\":%u,\"b\":%lu,\"bat\":%u}",
                i, lx, ly, rx, ry, l2, r2, (unsigned long)b, bat);

            if (len > 0) {
                webSocket.broadcastTXT(jsonBuf, (size_t)len);
            }
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println("\n==========================================");
    Serial.println("  MINI GAME CONSOLE - ESP32 BT BRIDGE     ");
    Serial.println("==========================================");

    // Initialize Bluepad32
    BP32.setup(&onConnectedController, &onDisconnectedController);
    BP32.forgetBluetoothKeys(); // Ensures clean PS3 Sixaxis reconnection without stale keys
    BP32.enableVirtualDevice(false);
    printLocalBtMac();

    // Configure WiFi SoftAP at 192.168.4.1
    WiFi.mode(WIFI_AP);
    IPAddress local_IP(192, 168, 4, 1);
    IPAddress gateway(192, 168, 4, 1);
    IPAddress subnet(255, 255, 255, 0);
    WiFi.softAPConfig(local_IP, gateway, subnet);
    WiFi.softAP(WIFI_SSID, WIFI_PASS, 6, 0, 4);
    WiFi.setSleep(false); // Disable WiFi power-save to minimize latency with BT coexistence

    Serial.printf("[WiFi] Access Point started! SSID: %s | Pass: %s\n", WIFI_SSID, WIFI_PASS);
    Serial.printf("[WiFi] WebSocket Server listening at ws://%s:%u\n",
                  WiFi.softAPIP().toString().c_str(), WS_PORT);

    webSocket.begin();
    webSocket.onEvent(onWebSocketEvent);
}

void loop() {
    bool dataUpdated = BP32.update();
    (void)dataUpdated;
    webSocket.loop();
    streamControllersAt60Hz();
    delay(1);
}
