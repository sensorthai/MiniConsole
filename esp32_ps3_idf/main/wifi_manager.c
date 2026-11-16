#include "wifi_manager.h"
#include "app_config.h"
#include <string.h>
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#if __has_include("esp_mac.h")
#include "esp_mac.h"
#endif
#include "lwip/inet.h"

#define TAG "WIFI_MGR"

static esp_netif_t *s_netif_ap  = NULL;
static esp_netif_t *s_netif_sta = NULL;
static wifi_status_info_t s_status = {
    .ap_active = false,
    .ap_ip = "192.168.4.1",
    .ap_clients = 0,
    .sta_connected = false,
    .sta_connecting = false,
    .sta_ip = "0.0.0.0",
    .sta_rssi = 0,
    .sta_ssid = ""
};

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    (void)arg;
    if (event_base == WIFI_EVENT) {
        switch (event_id) {
            case WIFI_EVENT_AP_START:
                s_status.ap_active = true;
                ESP_LOGI(TAG, "SoftAP started at http://%s", s_status.ap_ip);
                break;
            case WIFI_EVENT_AP_STOP:
                s_status.ap_active = false;
                break;
            case WIFI_EVENT_AP_STACONNECTED: {
                wifi_event_ap_staconnected_t *ev = (wifi_event_ap_staconnected_t *)event_data;
                s_status.ap_clients++;
                ESP_LOGI(TAG, "Station " MACSTR " joined AP, aid=%d (clients=%d)",
                         MAC2STR(ev->mac), ev->aid, s_status.ap_clients);
                break;
            }
            case WIFI_EVENT_AP_STADISCONNECTED: {
                wifi_event_ap_stadisconnected_t *ev = (wifi_event_ap_stadisconnected_t *)event_data;
                if (s_status.ap_clients > 0) s_status.ap_clients--;
                ESP_LOGI(TAG, "Station " MACSTR " left AP, aid=%d (clients=%d)",
                         MAC2STR(ev->mac), ev->aid, s_status.ap_clients);
                break;
            }
            case WIFI_EVENT_STA_START: {
                const app_config_t *cfg = app_config_get();
                if (cfg->sta_enabled && strlen(cfg->sta_ssid) > 0) {
                    s_status.sta_connecting = true;
                    esp_wifi_connect();
                }
                break;
            }
            case WIFI_EVENT_STA_DISCONNECTED: {
                s_status.sta_connected = false;
                snprintf(s_status.sta_ip, sizeof(s_status.sta_ip), "0.0.0.0");
                const app_config_t *cfg = app_config_get();
                if (cfg->sta_enabled && strlen(cfg->sta_ssid) > 0) {
                    s_status.sta_connecting = true;
                    ESP_LOGW(TAG, "WiFi STA disconnected, retrying connection to '%s'...", cfg->sta_ssid);
                    esp_wifi_connect();
                } else {
                    s_status.sta_connecting = false;
                }
                break;
            }
            default:
                break;
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        snprintf(s_status.sta_ip, sizeof(s_status.sta_ip), IPSTR, IP2STR(&event->ip_info.ip));
        s_status.sta_connected = true;
        s_status.sta_connecting = false;
        ESP_LOGI(TAG, "WiFi STA connected! IP Address: %s", s_status.sta_ip);
        extern esp_err_t ws_bridge_restart_client(void);
        void wifi_ws_reconnect_task(void *arg);
        xTaskCreate(wifi_ws_reconnect_task, "ws_mdns_reconn", 4096, NULL, 5, NULL);
    }
}

void wifi_ws_reconnect_task(void *arg)
{
    (void)arg;
    extern esp_err_t ws_bridge_restart_client(void);
    ws_bridge_restart_client();
    vTaskDelete(NULL);
}

esp_err_t wifi_manager_init(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    s_netif_ap  = esp_netif_create_default_wifi_ap();
    s_netif_sta = esp_netif_create_default_wifi_sta();

    wifi_init_config_t init_cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init_cfg));
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));

    /* Disable WiFi power save so Bluetooth Classic + WebSocket have low latency */
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));

    return wifi_manager_apply_config();
}

esp_err_t wifi_manager_apply_config(void)
{
    const app_config_t *cfg = app_config_get();

    wifi_config_t ap_cfg = {0};
    strncpy((char *)ap_cfg.ap.ssid, cfg->ap_ssid, sizeof(ap_cfg.ap.ssid) - 1);
    ap_cfg.ap.ssid_len = strlen(cfg->ap_ssid);
    ap_cfg.ap.channel = cfg->ap_channel ? cfg->ap_channel : 6;
    ap_cfg.ap.max_connection = 4;

    if (strlen(cfg->ap_pass) >= 8) {
        strncpy((char *)ap_cfg.ap.password, cfg->ap_pass, sizeof(ap_cfg.ap.password) - 1);
        ap_cfg.ap.authmode = WIFI_AUTH_WPA_WPA2_PSK;
    } else {
        ap_cfg.ap.authmode = WIFI_AUTH_OPEN;
    }

    wifi_config_t sta_cfg = {0};
    if (cfg->sta_enabled && strlen(cfg->sta_ssid) > 0) {
        strncpy((char *)sta_cfg.sta.ssid, cfg->sta_ssid, sizeof(sta_cfg.sta.ssid) - 1);
        strncpy((char *)sta_cfg.sta.password, cfg->sta_pass, sizeof(sta_cfg.sta.password) - 1);
        strncpy(s_status.sta_ssid, cfg->sta_ssid, sizeof(s_status.sta_ssid) - 1);
    } else {
        s_status.sta_ssid[0] = '\0';
    }

    esp_wifi_stop();
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_cfg));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());
    esp_wifi_set_ps(WIFI_PS_NONE);

    if (cfg->sta_enabled && strlen(cfg->sta_ssid) > 0) {
        s_status.sta_connecting = true;
        esp_wifi_connect();
    } else {
        s_status.sta_connected = false;
        s_status.sta_connecting = false;
        snprintf(s_status.sta_ip, sizeof(s_status.sta_ip), "0.0.0.0");
    }

    return ESP_OK;
}

void wifi_manager_get_status(wifi_status_info_t *status_out)
{
    if (!status_out) return;
    if (s_status.sta_connected) {
        wifi_ap_record_t ap_info;
        if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK) {
            s_status.sta_rssi = ap_info.rssi;
        }
    } else {
        s_status.sta_rssi = 0;
    }
    *status_out = s_status;
}

esp_err_t wifi_manager_scan(wifi_ap_record_t *ap_records, uint16_t *inout_count)
{
    if (!ap_records || !inout_count) return ESP_ERR_INVALID_ARG;

    wifi_scan_config_t scan_cfg = {
        .ssid = NULL,
        .bssid = NULL,
        .channel = 0,
        .show_hidden = false,
        .scan_type = WIFI_SCAN_TYPE_ACTIVE,
    };

    esp_err_t err = esp_wifi_scan_start(&scan_cfg, true);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "WiFi scan start failed: %s", esp_err_to_name(err));
        *inout_count = 0;
        return err;
    }

    return esp_wifi_scan_get_ap_records(inout_count, ap_records);
}
