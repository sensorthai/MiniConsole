#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "nvs_flash.h"
#include "esp_log.h"
#include "esp_system.h"
#include "ps3.h"
#include "app_config.h"
#include "wifi_manager.h"
#include "ws_bridge.h"
#include "web_server.h"
#include "app_mdns.h"
#include "cJSON.h"

#define TAG "MAIN"

static void uart_console_task(void *pvParameters)
{
    (void)pvParameters;
    char line_buf[256];
    while (1) {
        if (fgets(line_buf, sizeof(line_buf), stdin)) {
            char *p = line_buf;
            while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
            if (*p == '{') {
                cJSON *root = cJSON_Parse(p);
                if (root) {
                    app_config_t new_cfg = *app_config_get();
                    cJSON *it;
                    if ((it = cJSON_GetObjectItem(root, "target_player")) && cJSON_IsNumber(it)) {
                        new_cfg.target_player = (uint8_t)it->valueint;
                    }
                    if ((it = cJSON_GetObjectItem(root, "ap_ssid")) && cJSON_IsString(it)) {
                        strncpy(new_cfg.ap_ssid, it->valuestring, sizeof(new_cfg.ap_ssid) - 1);
                    }
                    if ((it = cJSON_GetObjectItem(root, "custom_bt_mac")) && cJSON_IsString(it)) {
                        uint8_t mac[6];
                        if (app_parse_mac_str(it->valuestring, mac) && !app_is_zero_mac(mac)) {
                            memcpy(new_cfg.custom_bt_mac, mac, 6);
                            new_cfg.use_custom_bt_mac = true;
                        }
                    }
                    cJSON_Delete(root);
                    app_config_update(&new_cfg);
                    printf("{\"ok\":true,\"msg\":\"Serial config updated, rebooting...\"}\n");
                    fflush(stdout);
                    vTaskDelay(pdMS_TO_TICKS(500));
                    esp_restart();
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "======================================================");
    ESP_LOGI(TAG, " MINI CONSOLE 3D - ESP32 PS3 4-Controller WS Bridge");
    ESP_LOGI(TAG, "======================================================");

    /* 1. Initialize NVS Flash */
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    /* 2. Load Persistent Configuration from NVS */
    app_config_t cfg;
    app_config_load(&cfg);

    /* 3. Configure Bluetooth Host MAC Address (From NVS config or default 44:D8:32:C3:8B:C5) */
    uint8_t host_mac[6];
    if (cfg.use_custom_bt_mac && !app_is_zero_mac(cfg.custom_bt_mac)) {
        memcpy(host_mac, cfg.custom_bt_mac, 6);
    } else {
        uint8_t default_ps3_host_mac[6] = {0x44, 0xD8, 0x32, 0xC3, 0x8B, 0xC5};
        memcpy(host_mac, default_ps3_host_mac, 6);
    }
    char bt_host_mac_str[20];
    app_format_mac_str(host_mac, bt_host_mac_str, sizeof(bt_host_mac_str));
    ESP_LOGI(TAG, "Bluetooth Host MAC: %s", bt_host_mac_str);
    ps3SetBluetoothMacAddress(host_mac);

    /* 3.1. Set initial Target Slot for 1 Joystick role */
    uint8_t initial_slot = (cfg.target_player >= 1 && cfg.target_player <= 4) ? (cfg.target_player - 1) : 0;
    ps3_l2cap_set_target_slot(initial_slot);

    /* 4. Initialize WiFi AP + STA Mode */
    ESP_ERROR_CHECK(wifi_manager_init());

    /* 4.1. Start mDNS to match AP SSID (e.g. http://<ap_ssid>.local) */
    app_mdns_init(cfg.ap_ssid);

    /* 5. Initialize Bluetooth Classic L2CAP Host for up to 4 PS3 Controllers (P1..P4) */
    ps3Init();

    uint8_t bt_mac[6] = {0};
    ps3GetBluetoothMacAddress(bt_mac);
    char bt_mac_str[20];
    app_format_mac_str(bt_mac, bt_mac_str, sizeof(bt_mac_str));
    ESP_LOGI(TAG, "PS3 Bluetooth Host Ready (Max 4 Controllers) - BT MAC: %s", bt_mac_str);

    /* 6. Start Web UI AP Configuration Portal (http://192.168.4.1/) */
    ESP_ERROR_CHECK(web_server_start());

    /* 7. Start 60Hz WebSocket Streamer (Outbound Client to Game Server + Direct WS Server) */
    ESP_ERROR_CHECK(ws_bridge_init());

    /* 8. Start UART Console Task for serial configuration */
    xTaskCreate(uart_console_task, "uart_console", 4096, NULL, 3, NULL);

    ESP_LOGI(TAG, "System Ready! Connect to WiFi AP '%s' (pass: '%s') -> http://192.168.4.1",
             cfg.ap_ssid, cfg.ap_pass);
}
