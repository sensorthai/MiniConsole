#include "web_server.h"
#include "web_ui_html.h"
#include "app_config.h"
#include "wifi_manager.h"
#include "ws_bridge.h"
#include "app_mdns.h"
#include "ps3.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_http_server.h"
#include "esp_system.h"
#include "esp_mac.h"
#include "esp_log.h"
#include "cJSON.h"

#define TAG "WEB_SRV"

static httpd_handle_t s_server = NULL;

static const char *battery_to_str(enum ps3_status_battery bat)
{
    switch (bat) {
        case ps3_status_battery_charging: return "Charging ⚡";
        case ps3_status_battery_full:     return "100% (Full)";
        case ps3_status_battery_high:     return "80% (High)";
        case ps3_status_battery_low:      return "40% (Low)";
        case ps3_status_battery_dying:    return "15% (Dying)";
        case ps3_status_battery_shutdown: return "5% (Empty)";
        default:                          return "Unknown";
    }
}

static esp_err_t index_get_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html; charset=utf-8");
    return httpd_resp_send(req, WEB_UI_INDEX_HTML, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t api_status_get_handler(httpd_req_t *req)
{
    cJSON *root = cJSON_CreateObject();

    uint8_t bt_mac[6] = {0};
    ps3GetBluetoothMacAddress(bt_mac);
    char bt_mac_str[20];
    app_format_mac_str(bt_mac, bt_mac_str, sizeof(bt_mac_str));
    cJSON_AddStringToObject(root, "bt_mac", bt_mac_str);

    uint8_t hw_base[6] = {0};
    esp_efuse_mac_get_default(hw_base);
    char hw_base_str[20];
    app_format_mac_str(hw_base, hw_base_str, sizeof(hw_base_str));
    cJSON_AddStringToObject(root, "esp32_hw_base_mac", hw_base_str);

    uint8_t hw_bt[6] = {0};
    memcpy(hw_bt, hw_base, 6);
    hw_bt[5] += 2;
    char hw_bt_str[20];
    app_format_mac_str(hw_bt, hw_bt_str, sizeof(hw_bt_str));
    cJSON_AddStringToObject(root, "esp32_hw_bt_mac", hw_bt_str);

    /* mDNS Info (synchronized with AP SSID) */
    cJSON_AddStringToObject(root, "mdns_hostname", app_mdns_get_hostname());
    char mdns_url[80];
    snprintf(mdns_url, sizeof(mdns_url), "http://%s.local", app_mdns_get_hostname());
    cJSON_AddStringToObject(root, "mdns_url", mdns_url);

    /* WiFi Status */
    wifi_status_info_t wstat;
    wifi_manager_get_status(&wstat);
    cJSON *wifi = cJSON_CreateObject();
    cJSON_AddBoolToObject(wifi, "ap_active", wstat.ap_active);
    cJSON_AddStringToObject(wifi, "ap_ip", wstat.ap_ip);
    cJSON_AddNumberToObject(wifi, "ap_clients", wstat.ap_clients);
    cJSON_AddBoolToObject(wifi, "sta_connected", wstat.sta_connected);
    cJSON_AddBoolToObject(wifi, "sta_connecting", wstat.sta_connecting);
    cJSON_AddStringToObject(wifi, "sta_ip", wstat.sta_ip);
    cJSON_AddStringToObject(wifi, "sta_ssid", wstat.sta_ssid);
    cJSON_AddNumberToObject(wifi, "sta_rssi", wstat.sta_rssi);
    cJSON_AddItemToObject(root, "wifi", wifi);

    /* WebSocket Status */
    ws_bridge_status_t wsstat;
    ws_bridge_get_status(&wsstat);
    cJSON *ws = cJSON_CreateObject();
    cJSON_AddBoolToObject(ws, "client_enabled", wsstat.client_enabled);
    cJSON_AddBoolToObject(ws, "client_connected", wsstat.client_connected);
    cJSON_AddStringToObject(ws, "server_url", wsstat.server_url);
    cJSON_AddNumberToObject(ws, "tx", wsstat.tx_packets);
    cJSON_AddNumberToObject(ws, "rx", wsstat.rx_packets);
    cJSON_AddNumberToObject(ws, "direct_clients", wsstat.direct_ws_clients);
    cJSON_AddItemToObject(root, "ws", ws);

    /* 4 PS3 Controller Slots (P1..P4) */
    cJSON *pads = cJSON_CreateArray();
    for (uint8_t i = 0; i < PS3_MAX_CONTROLLERS; i++) {
        ps3_slot_info_t info;
        ps3MultiGetSlotInfo(i, &info);
        cJSON *p = cJSON_CreateObject();
        cJSON_AddNumberToObject(p, "slot", i);
        bool connected = info.in_use && info.is_active;
        cJSON_AddBoolToObject(p, "connected", connected);

        char mac_str[20];
        app_format_mac_str(info.bd_addr, mac_str, sizeof(mac_str));
        cJSON_AddStringToObject(p, "mac", mac_str);

        const app_config_t *pcfg = app_config_get();
        char pmac_str[20];
        app_format_mac_str(pcfg->pinned_mac[i], pmac_str, sizeof(pmac_str));
        cJSON_AddStringToObject(p, "pinned_mac", pmac_str);

        cJSON_AddNumberToObject(p, "lx", connected ? info.state.analog.stick.lx : 0);
        cJSON_AddNumberToObject(p, "ly", connected ? info.state.analog.stick.ly : 0);
        cJSON_AddNumberToObject(p, "rx", connected ? info.state.analog.stick.rx : 0);
        cJSON_AddNumberToObject(p, "ry", connected ? info.state.analog.stick.ry : 0);
        cJSON_AddNumberToObject(p, "l2", connected ? info.state.analog.button.l2 : 0);
        cJSON_AddNumberToObject(p, "r2", connected ? info.state.analog.button.r2 : 0);
        cJSON_AddNumberToObject(p, "b",  connected ? ws_bridge_encode_buttons(i) : 0);
        cJSON_AddNumberToObject(p, "bat", connected ? (int)info.state.status.battery : 0);
        cJSON_AddStringToObject(p, "bat_str", connected ? battery_to_str(info.state.status.battery) : "Disconnected");
        cJSON_AddNumberToObject(p, "pkts", info.packet_count);
        cJSON_AddItemToArray(pads, p);
    }
    cJSON_AddItemToObject(root, "pads", pads);

    /* Saved Config */
    const app_config_t *cfg = app_config_get();
    cJSON *c = cJSON_CreateObject();
    cJSON_AddStringToObject(c, "ap_ssid", cfg->ap_ssid);
    cJSON_AddStringToObject(c, "ap_pass", cfg->ap_pass);
    cJSON_AddBoolToObject(c, "sta_enabled", cfg->sta_enabled);
    cJSON_AddStringToObject(c, "sta_ssid", cfg->sta_ssid);
    cJSON_AddStringToObject(c, "sta_pass", cfg->sta_pass);
    cJSON_AddBoolToObject(c, "ws_client_enabled", cfg->ws_client_enabled);
    cJSON_AddStringToObject(c, "ws_server_url", cfg->ws_server_url);
    cJSON_AddNumberToObject(c, "send_rate_hz", cfg->send_rate_hz);
    cJSON_AddNumberToObject(c, "deadzone", cfg->deadzone);
    cJSON_AddNumberToObject(c, "target_player", cfg->target_player);
    cJSON_AddBoolToObject(c, "use_custom_bt_mac", cfg->use_custom_bt_mac);

    char custom_mac_str[20];
    app_format_mac_str(cfg->custom_bt_mac, custom_mac_str, sizeof(custom_mac_str));
    cJSON_AddStringToObject(c, "custom_bt_mac", custom_mac_str);

    cJSON *pinned = cJSON_CreateArray();
    for (int i = 0; i < 4; i++) {
        char pmac[20];
        app_format_mac_str(cfg->pinned_mac[i], pmac, sizeof(pmac));
        cJSON_AddItemToArray(pinned, cJSON_CreateString(pmac));
    }
    cJSON_AddItemToObject(c, "pinned_macs", pinned);
    cJSON_AddItemToObject(root, "config", c);

    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    esp_err_t res = httpd_resp_send(req, out, HTTPD_RESP_USE_STRLEN);
    free(out);
    return res;
}

static esp_err_t api_wifi_scan_get_handler(httpd_req_t *req)
{
    uint16_t count = 16;
    wifi_ap_record_t records[16];
    memset(records, 0, sizeof(records));

    wifi_manager_scan(records, &count);

    cJSON *root = cJSON_CreateObject();
    cJSON *arr = cJSON_CreateArray();
    for (uint16_t i = 0; i < count; i++) {
        if (strlen((const char *)records[i].ssid) == 0) continue;
        cJSON *item = cJSON_CreateObject();
        cJSON_AddStringToObject(item, "ssid", (const char *)records[i].ssid);
        cJSON_AddNumberToObject(item, "rssi", records[i].rssi);
        cJSON_AddNumberToObject(item, "ch", records[i].primary);
        cJSON_AddNumberToObject(item, "auth", records[i].authmode);
        cJSON_AddItemToArray(arr, item);
    }
    cJSON_AddItemToObject(root, "networks", arr);

    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    httpd_resp_set_type(req, "application/json");
    esp_err_t res = httpd_resp_send(req, out, HTTPD_RESP_USE_STRLEN);
    free(out);
    return res;
}

static void delayed_restart_task(void *arg)
{
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(800));
    esp_restart();
}

static esp_err_t api_config_post_handler(httpd_req_t *req)
{
    char buf[1024];
    int received = httpd_req_recv(req, buf, sizeof(buf) - 1);
    if (received <= 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Empty body");
        return ESP_FAIL;
    }
    buf[received] = '\0';

    cJSON *root = cJSON_Parse(buf);
    if (!root) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Invalid JSON");
        return ESP_FAIL;
    }

    app_config_t new_cfg = *app_config_get();
    bool wifi_changed = false;
    bool ws_changed = false;

    cJSON *it;
    if ((it = cJSON_GetObjectItem(root, "sta_enabled")) && cJSON_IsBool(it)) {
        bool v = cJSON_IsTrue(it);
        if (new_cfg.sta_enabled != v) { new_cfg.sta_enabled = v; wifi_changed = true; }
    }
    if ((it = cJSON_GetObjectItem(root, "sta_ssid")) && cJSON_IsString(it)) {
        if (strcmp(new_cfg.sta_ssid, it->valuestring) != 0) {
            strncpy(new_cfg.sta_ssid, it->valuestring, sizeof(new_cfg.sta_ssid) - 1);
            wifi_changed = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "sta_pass")) && cJSON_IsString(it)) {
        if (strcmp(new_cfg.sta_pass, it->valuestring) != 0) {
            strncpy(new_cfg.sta_pass, it->valuestring, sizeof(new_cfg.sta_pass) - 1);
            wifi_changed = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "ap_ssid")) && cJSON_IsString(it) && strlen(it->valuestring) > 0) {
        if (strcmp(new_cfg.ap_ssid, it->valuestring) != 0) {
            strncpy(new_cfg.ap_ssid, it->valuestring, sizeof(new_cfg.ap_ssid) - 1);
            wifi_changed = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "ap_pass")) && cJSON_IsString(it)) {
        if (strcmp(new_cfg.ap_pass, it->valuestring) != 0) {
            strncpy(new_cfg.ap_pass, it->valuestring, sizeof(new_cfg.ap_pass) - 1);
            wifi_changed = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "ws_client_enabled")) && cJSON_IsBool(it)) {
        bool v = cJSON_IsTrue(it);
        if (new_cfg.ws_client_enabled != v) { new_cfg.ws_client_enabled = v; ws_changed = true; }
    }
    if ((it = cJSON_GetObjectItem(root, "ws_server_url")) && cJSON_IsString(it)) {
        if (strcmp(new_cfg.ws_server_url, it->valuestring) != 0) {
            strncpy(new_cfg.ws_server_url, it->valuestring, sizeof(new_cfg.ws_server_url) - 1);
            ws_changed = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "send_rate_hz")) && cJSON_IsNumber(it)) {
        int r = it->valueint;
        if (r >= 10 && r <= 100) new_cfg.send_rate_hz = (uint8_t)r;
    }
    if ((it = cJSON_GetObjectItem(root, "deadzone")) && cJSON_IsNumber(it)) {
        int dz = it->valueint;
        if (dz >= 0 && dz <= 50) new_cfg.deadzone = (uint8_t)dz;
    }
    if ((it = cJSON_GetObjectItem(root, "target_player")) && cJSON_IsNumber(it)) {
        int tp = it->valueint;
        if (tp >= 1 && tp <= 4) {
            new_cfg.target_player = (uint8_t)tp;
            ps3_l2cap_set_target_slot((uint8_t)(tp - 1));
            for (uint8_t s = 0; s < 4; s++) {
                if (s != (tp - 1) && ps3MultiIsConnected(s)) {
                    ps3MultiSwapSlots(s, (uint8_t)(tp - 1));
                    break;
                }
            }
            if (ps3MultiIsConnected((uint8_t)(tp - 1))) {
                ps3MultiSetLed((uint8_t)(tp - 1), (uint8_t)tp);
            }
        }
    }
    bool bt_mac_changed = false;
    if ((it = cJSON_GetObjectItem(root, "use_custom_bt_mac")) && cJSON_IsBool(it)) {
        new_cfg.use_custom_bt_mac = cJSON_IsTrue(it);
    }
    if ((it = cJSON_GetObjectItem(root, "custom_bt_mac")) && cJSON_IsString(it)) {
        uint8_t mac[6];
        if (app_parse_mac_str(it->valuestring, mac) && !app_is_zero_mac(mac)) {
            if (new_cfg.use_custom_bt_mac) {
                if (memcmp(new_cfg.custom_bt_mac, mac, 6) != 0) {
                    bt_mac_changed = true;
                }
            } else {
                uint8_t cur_bt_mac[6] = {0};
                ps3GetBluetoothMacAddress(cur_bt_mac);
                if (memcmp(cur_bt_mac, mac, 6) != 0) {
                    bt_mac_changed = true;
                }
            }
            memcpy(new_cfg.custom_bt_mac, mac, 6);
            new_cfg.use_custom_bt_mac = true;
        }
    }
    if ((it = cJSON_GetObjectItem(root, "pinned_macs")) && cJSON_IsArray(it)) {
        for (int i = 0; i < 4 && i < cJSON_GetArraySize(it); i++) {
            cJSON *m = cJSON_GetArrayItem(it, i);
            if (cJSON_IsString(m)) {
                uint8_t mac[6];
                if (app_parse_mac_str(m->valuestring, mac)) {
                    memcpy(new_cfg.pinned_mac[i], mac, 6);
                }
            }
        }
    }

    bool do_reboot = false;
    if ((it = cJSON_GetObjectItem(root, "reboot")) && cJSON_IsBool(it)) {
        do_reboot = cJSON_IsTrue(it);
    }
    if (bt_mac_changed) {
        do_reboot = true;
    }
    cJSON_Delete(root);

    app_config_update(&new_cfg);

    if (wifi_changed && !do_reboot) {
        app_mdns_set_hostname_from_ssid(new_cfg.ap_ssid);
        wifi_manager_apply_config();
    }
    if (ws_changed && !do_reboot) {
        ws_bridge_restart_client();
    }

    cJSON *resp_json = cJSON_CreateObject();
    cJSON_AddBoolToObject(resp_json, "ok", true);
    cJSON_AddBoolToObject(resp_json, "reboot", do_reboot);
    if (bt_mac_changed) {
        cJSON_AddStringToObject(resp_json, "msg", "เปลี่ยน Bluetooth MAC เรียบร้อย กำลังรีบูต ESP32 เพื่อให้ฮาร์ดแวร์อัปเดต...");
    } else {
        cJSON_AddStringToObject(resp_json, "msg", "บันทึกตำแหน่งผู้เล่นและการตั้งค่าเรียบร้อยแล้ว");
    }
    char *out_resp = cJSON_PrintUnformatted(resp_json);
    cJSON_Delete(resp_json);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, out_resp, HTTPD_RESP_USE_STRLEN);
    free(out_resp);

    if (do_reboot) {
        xTaskCreate(delayed_restart_task, "reboot_task", 2048, NULL, 5, NULL);
    }
    return ESP_OK;
}

static esp_err_t api_ps3_action_post_handler(httpd_req_t *req)
{
    char buf[256];
    int received = httpd_req_recv(req, buf, sizeof(buf) - 1);
    if (received <= 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Empty body");
        return ESP_FAIL;
    }
    buf[received] = '\0';

    cJSON *root = cJSON_Parse(buf);
    if (!root) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Invalid JSON");
        return ESP_FAIL;
    }

    const char *action = cJSON_GetObjectItem(root, "action") ? cJSON_GetObjectItem(root, "action")->valuestring : "";
    int slot   = cJSON_GetObjectItem(root, "slot")   ? cJSON_GetObjectItem(root, "slot")->valueint   : 0;
    int target = cJSON_GetObjectItem(root, "target") ? cJSON_GetObjectItem(root, "target")->valueint : 0;
    const char *mac_arg = (cJSON_GetObjectItem(root, "mac") && cJSON_IsString(cJSON_GetObjectItem(root, "mac")))
                          ? cJSON_GetObjectItem(root, "mac")->valuestring : NULL;

    cJSON *resp = cJSON_CreateObject();
    cJSON_AddBoolToObject(resp, "ok", true);

    if (strcmp(action, "rumble") == 0) {
        ps3MultiRumble((uint8_t)slot, 200, 35, 200, 35);
        cJSON_AddStringToObject(resp, "msg", "ส่งคำสั่งสั่นและไฟ LED ไปยังจอยแล้ว");
    } else if (strcmp(action, "set_target_player") == 0) {
        uint8_t tp = (target >= 1 && target <= 4) ? (uint8_t)target : 1;
        app_config_t cfg = *app_config_get();
        cfg.target_player = tp;
        app_config_update(&cfg);
        ps3_l2cap_set_target_slot((uint8_t)(tp - 1));
        for (uint8_t s = 0; s < 4; s++) {
            if (s != (tp - 1) && ps3MultiIsConnected(s)) {
                ps3MultiSwapSlots(s, (uint8_t)(tp - 1));
                break;
            }
        }
        if (ps3MultiIsConnected((uint8_t)(tp - 1))) {
            ps3MultiSetLed((uint8_t)(tp - 1), tp);
        }
        cJSON_AddNumberToObject(resp, "target_player", tp);
        cJSON_AddStringToObject(resp, "msg", "กำหนดตำแหน่งผู้เล่นเรียบร้อยแล้ว");
    } else if (strcmp(action, "led") == 0) {
        uint8_t led_num = (target >= 1 && target <= 4) ? (uint8_t)target : (uint8_t)((slot & 3) + 1);
        ps3MultiSetLed((uint8_t)slot, led_num);
        cJSON_AddStringToObject(resp, "msg", "ตั้งค่าไฟ LED บนจอยเรียบร้อยแล้ว");
    } else if (strcmp(action, "disconnect") == 0) {
        ps3MultiDisconnectSlot((uint8_t)slot);
        cJSON_AddStringToObject(resp, "msg", "ตัดการเชื่อมต่อจอยแล้ว");
    } else if (strcmp(action, "swap") == 0) {
        ps3MultiSwapSlots((uint8_t)slot, (uint8_t)target);
        cJSON_AddStringToObject(resp, "msg", "ย้าย/สลับสล็อตจอยเรียบร้อยแล้ว");
    } else if (strcmp(action, "pin") == 0) {
        ps3_slot_info_t info;
        if (ps3MultiGetSlotInfo((uint8_t)slot, &info) && info.in_use) {
            app_config_t cfg = *app_config_get();
            memcpy(cfg.pinned_mac[slot & 3], info.bd_addr, 6);
            app_config_update(&cfg);
            char mac_str[20];
            app_format_mac_str(info.bd_addr, mac_str, sizeof(mac_str));
            cJSON_AddStringToObject(resp, "pinned_mac", mac_str);
            cJSON_AddStringToObject(resp, "msg", "ล็อก MAC จอยประจำสล็อตนี้แล้ว");
        } else {
            cJSON_AddStringToObject(resp, "msg", "ยังไม่มีจอยเชื่อมต่อในสล็อตนี้");
        }
    } else if (strcmp(action, "set_pin_mac") == 0 && mac_arg) {
        uint8_t parsed[6] = {0};
        if (app_parse_mac_str(mac_arg, parsed)) {
            app_config_t cfg = *app_config_get();
            memcpy(cfg.pinned_mac[slot & 3], parsed, 6);
            app_config_update(&cfg);
            char mac_str[20];
            app_format_mac_str(parsed, mac_str, sizeof(mac_str));
            cJSON_AddStringToObject(resp, "pinned_mac", mac_str);
            cJSON_AddStringToObject(resp, "msg", "บันทึก MAC ประจำสล็อตเรียบร้อยแล้ว");
        } else {
            cJSON_AddStringToObject(resp, "msg", "รูปแบบ MAC Address ไม่ถูกต้อง (ตัวอย่าง AA:BB:CC:DD:EE:FF)");
        }
    } else if (strcmp(action, "unpin") == 0) {
        app_config_t cfg = *app_config_get();
        memset(cfg.pinned_mac[slot & 3], 0, 6);
        app_config_update(&cfg);
        cJSON_AddStringToObject(resp, "pinned_mac", "00:00:00:00:00:00");
        cJSON_AddStringToObject(resp, "msg", "ปลดล็อก MAC ประจำสล็อตนี้แล้ว (รับจอยอัตโนมัติ)");
    } else if (strcmp(action, "test_ws") == 0) {
        ws_bridge_send_test_packet((uint8_t)slot);
        cJSON_AddStringToObject(resp, "msg", "ส่งคำสั่งจำลองไปยัง Game App Server แล้ว");
    }

    cJSON_Delete(root);
    char *out = cJSON_PrintUnformatted(resp);
    cJSON_Delete(resp);

    httpd_resp_set_type(req, "application/json");
    esp_err_t res = httpd_resp_send(req, out, HTTPD_RESP_USE_STRLEN);
    free(out);
    return res;
}

esp_err_t web_server_start(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.max_open_sockets = 4;
    config.lru_purge_enable = true;
    config.max_uri_handlers = 12;
    config.stack_size = 6144;

    esp_err_t err = httpd_start(&s_server, &config);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start HTTP Web UI server: %s", esp_err_to_name(err));
        return err;
    }

    static const httpd_uri_t uri_index = {
        .uri      = "/",
        .method   = HTTP_GET,
        .handler  = index_get_handler,
        .user_ctx = NULL
    };
    static const httpd_uri_t uri_status = {
        .uri      = "/api/status",
        .method   = HTTP_GET,
        .handler  = api_status_get_handler,
        .user_ctx = NULL
    };
    static const httpd_uri_t uri_scan = {
        .uri      = "/api/wifi/scan",
        .method   = HTTP_GET,
        .handler  = api_wifi_scan_get_handler,
        .user_ctx = NULL
    };
    static const httpd_uri_t uri_cfg = {
        .uri      = "/api/config",
        .method   = HTTP_POST,
        .handler  = api_config_post_handler,
        .user_ctx = NULL
    };
    static const httpd_uri_t uri_ps3_action = {
        .uri      = "/api/ps3/action",
        .method   = HTTP_POST,
        .handler  = api_ps3_action_post_handler,
        .user_ctx = NULL
    };

    httpd_register_uri_handler(s_server, &uri_index);
    httpd_register_uri_handler(s_server, &uri_status);
    httpd_register_uri_handler(s_server, &uri_scan);
    httpd_register_uri_handler(s_server, &uri_cfg);
    httpd_register_uri_handler(s_server, &uri_ps3_action);

    /* Also register /ws on port 80 HTTP server */
    ws_bridge_register_httpd(s_server);

    ESP_LOGI(TAG, "Web UI AP Configuration Portal started at http://192.168.4.1/");
    return ESP_OK;
}
