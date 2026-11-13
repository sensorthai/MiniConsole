/**
 * Mini Game Console - ESP32-S3 USB Host Wired DualShock 3 Bridge
 * Target Hardware: ESP32-S3-DevKitC-1 (with USB-OTG port wired to DualShock 3)
 * Note: ESP32-S3 only has BLE 5.0 (no Bluetooth Classic), so wired USB Host mode
 *       is used to read a DualShock 3 pad by sending the 0xF4 HID feature report.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include "usb/usb_host.h"

static const char* WIFI_SSID = "MiniConsole";
static const char* WIFI_PASS = "12345678";
static const uint16_t WS_PORT = 81;

// Sony Corp VID & DualShock 3 PID
#define SONY_VID 0x054C
#define DS3_PID  0x0268

WebSocketsServer webSocket(WS_PORT);

struct DS3State {
    bool connected = false;
    int8_t lx = 0, ly = 0, rx = 0, ry = 0;
    uint8_t l2 = 0, r2 = 0;
    uint32_t buttons = 0;
    uint8_t battery = 5;
} ds3;

usb_host_client_handle_t client_hdl = nullptr;
usb_device_handle_t dev_hdl = nullptr;
usb_transfer_t* in_xfer = nullptr;
usb_transfer_t* ctrl_xfer = nullptr;
uint8_t ep_in_addr = 0x81;
unsigned long lastSendMs = 0;

// Button Bitmask matching ESP32 Bluetooth bridge
enum PadButtons : uint32_t {
    BTN_CROSS    = (1 << 0),
    BTN_CIRCLE   = (1 << 1),
    BTN_SQUARE   = (1 << 2),
    BTN_TRIANGLE = (1 << 3),
    BTN_L1       = (1 << 4),
    BTN_R1       = (1 << 5),
    BTN_L2_DIG   = (1 << 6),
    BTN_R2_DIG   = (1 << 7),
    BTN_SELECT   = (1 << 8),
    BTN_START    = (1 << 9),
    BTN_L3       = (1 << 10),
    BTN_R3       = (1 << 11),
    BTN_UP       = (1 << 12),
    BTN_DOWN     = (1 << 13),
    BTN_LEFT     = (1 << 14),
    BTN_RIGHT    = (1 << 15),
    BTN_PS       = (1UL << 16)
};

// Parse 49-byte DualShock 3 USB HID Input Report (Report ID 0x01)
void parseDS3Report(const uint8_t* d, size_t len) {
    if (len < 31 || d[0] != 0x01) return;

    uint8_t b0 = d[2]; // Select, L3, R3, Start, Up, Right, Down, Left
    uint8_t b1 = d[3]; // L2, R2, L1, R1, Triangle, Circle, Cross, Square
    uint8_t b2 = d[4]; // PS Button (bit 0)

    uint32_t mask = 0;
    if (b1 & 0x40) mask |= BTN_CROSS;
    if (b1 & 0x20) mask |= BTN_CIRCLE;
    if (b1 & 0x80) mask |= BTN_SQUARE;
    if (b1 & 0x10) mask |= BTN_TRIANGLE;
    if (b1 & 0x04) mask |= BTN_L1;
    if (b1 & 0x08) mask |= BTN_R1;
    if (b1 & 0x01) mask |= BTN_L2_DIG;
    if (b1 & 0x02) mask |= BTN_R2_DIG;

    if (b0 & 0x01) mask |= BTN_SELECT;
    if (b0 & 0x08) mask |= BTN_START;
    if (b0 & 0x02) mask |= BTN_L3;
    if (b0 & 0x04) mask |= BTN_R3;
    if (b0 & 0x10) mask |= BTN_UP;
    if (b0 & 0x40) mask |= BTN_DOWN;
    if (b0 & 0x80) mask |= BTN_LEFT;
    if (b0 & 0x20) mask |= BTN_RIGHT;
    if (b2 & 0x01) mask |= BTN_PS;

    ds3.lx = (int8_t)((int)d[6] - 128);
    ds3.ly = (int8_t)((int)d[7] - 128);
    ds3.rx = (int8_t)((int)d[8] - 128);
    ds3.ry = (int8_t)((int)d[9] - 128);
    ds3.l2 = d[18];
    ds3.r2 = d[19];
    ds3.buttons = mask;
    ds3.battery = constrain((int)d[30], 1, 5);
}

static void inTransferCallback(usb_transfer_t* xfer) {
    if (xfer->status == USB_TRANSFER_STATUS_COMPLETED && xfer->actual_num_bytes > 0) {
        parseDS3Report(xfer->data_buffer, xfer->actual_num_bytes);
    }
    if (ds3.connected && dev_hdl) {
        usb_host_transfer_submit(xfer);
    }
}

static void ctrlTransferCallback(usb_transfer_t* xfer) {
    Serial.printf("[USB] DS3 0xF4 Feature Enable status: %d\n", xfer->status);
    // Start polling interrupt IN endpoint
    if (in_xfer && dev_hdl) {
        in_xfer->device_handle = dev_hdl;
        in_xfer->bEndpointAddress = ep_in_addr;
        in_xfer->callback = inTransferCallback;
        in_xfer->num_bytes = 64;
        usb_host_transfer_submit(in_xfer);
    }
}

// Send magic 0xF4 feature report to wake DualShock 3 over USB
void sendDS3EnableFeatureReport() {
    if (!ctrl_xfer || !dev_hdl) return;
    // Setup packet: bmRequestType=0x21 (Host2Dev | Class | Interface),
    // bRequest=0x09 (SET_REPORT), wValue=0x03F4 (Feature Report 0xF4), wIndex=0, wLength=4
    uint8_t* buf = ctrl_xfer->data_buffer;
    buf[0] = 0x21;
    buf[1] = 0x09;
    buf[2] = 0xF4;
    buf[3] = 0x03;
    buf[4] = 0x00;
    buf[5] = 0x00;
    buf[6] = 0x04;
    buf[7] = 0x00;
    // Payload: { 0x42, 0x0C, 0x00, 0x00 }
    buf[8]  = 0x42;
    buf[9]  = 0x0C;
    buf[10] = 0x00;
    buf[11] = 0x00;

    ctrl_xfer->device_handle = dev_hdl;
    ctrl_xfer->bEndpointAddress = 0;
    ctrl_xfer->callback = ctrlTransferCallback;
    ctrl_xfer->num_bytes = 12;
    usb_host_transfer_submit_control(client_hdl, ctrl_xfer);
}

static void clientEventCallback(const usb_host_client_event_msg_t* event_msg, void* arg) {
    if (event_msg->event == USB_HOST_CLIENT_EVENT_NEW_DEV) {
        uint8_t addr = event_msg->new_dev.address;
        Serial.printf("[USB] New USB device at address %u\n", addr);
        if (usb_host_device_open(client_hdl, addr, &dev_hdl) == ESP_OK) {
            const usb_device_desc_t* desc;
            usb_host_get_device_descriptor(dev_hdl, &desc);
            Serial.printf("[USB] VID: 0x%04X | PID: 0x%04X\n", desc->idVendor, desc->idProduct);
            if (desc->idVendor == SONY_VID && desc->idProduct == DS3_PID) {
                usb_host_interface_claim(client_hdl, dev_hdl, 0, 0);
                ds3.connected = true;
                sendDS3EnableFeatureReport();
            }
        }
    } else if (event_msg->event == USB_HOST_CLIENT_EVENT_DEV_GONE) {
        Serial.println("[USB] DualShock 3 disconnected");
        ds3.connected = false;
        if (dev_hdl) {
            usb_host_interface_release(client_hdl, dev_hdl, 0);
            usb_host_device_close(client_hdl, dev_hdl);
            dev_hdl = nullptr;
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println("\n==========================================");
    Serial.println("  MINI GAME CONSOLE - ESP32-S3 USB HOST   ");
    Serial.println("==========================================");

    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1), IPAddress(255, 255, 255, 0));
    WiFi.softAP(WIFI_SSID, WIFI_PASS, 6, 0, 4);
    WiFi.setSleep(false);

    webSocket.begin();

    const usb_host_config_t host_cfg = {
        .skip_phy_setup = false,
        .intr_flags = ESP_INTR_FLAG_LEVEL1
    };
    usb_host_install(&host_cfg);

    const usb_host_client_config_t client_cfg = {
        .is_synchronous = false,
        .max_num_event_msg = 5,
        .async = {
            .client_event_callback = clientEventCallback,
            .callback_arg = nullptr
        }
    };
    usb_host_client_register(&client_cfg, &client_hdl);

    usb_host_transfer_alloc(64, 0, &in_xfer);
    usb_host_transfer_alloc(64, 0, &ctrl_xfer);
    Serial.println("[USB] Waiting for wired DualShock 3 on USB-OTG port...");
}

void loop() {
    uint32_t event_flags;
    usb_host_lib_handle_events(0, &event_flags);
    if (client_hdl) {
        usb_host_client_handle_events(client_hdl, 0);
    }
    webSocket.loop();

    unsigned long now = millis();
    if (ds3.connected && (now - lastSendMs >= 16)) {
        lastSendMs = now;
        if (webSocket.connectedClients() > 0) {
            char msg[128];
            int len = snprintf(msg, sizeof(msg),
                "{\"t\":\"pad\",\"p\":0,\"lx\":%d,\"ly\":%d,\"rx\":%d,\"ry\":%d,\"l2\":%u,\"r2\":%u,\"b\":%lu,\"bat\":%u}",
                ds3.lx, ds3.ly, ds3.rx, ds3.ry, ds3.l2, ds3.r2, (unsigned long)ds3.buttons, ds3.battery);
            if (len > 0) webSocket.broadcastTXT(msg, (size_t)len);
        }
    }
}
