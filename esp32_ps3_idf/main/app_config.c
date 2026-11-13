#include "app_config.h"
#include <string.h>
#include <stdio.h>
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "ps3.h"

#define TAG "APP_CFG"
#define NVS_NAMESPACE "ps3_bridge"
#define NVS_KEY_BLOB  "cfg_v1"

static app_config_t s_cfg;

void app_config_init_defaults(app_config_t *cfg)
{
    memset(cfg, 0, sizeof(app_config_t));
    cfg->ap_channel = 6;

    cfg->sta_enabled = true;
    strncpy(cfg->sta_ssid, "WSA-2.5G", sizeof(cfg->sta_ssid) - 1);
    strncpy(cfg->sta_pass, "0882988966", sizeof(cfg->sta_pass) - 1);

    cfg->ws_client_enabled = true;
    strncpy(cfg->ws_server_url, "ws://192.168.1.144:8080/ws", sizeof(cfg->ws_server_url) - 1);
    cfg->send_rate_hz = 60;
    cfg->deadzone = 8;
    cfg->use_custom_bt_mac = true;
    memset(cfg->pinned_mac, 0, sizeof(cfg->pinned_mac));

    uint8_t efuse_mac[6] = {0};
    esp_efuse_mac_get_default(efuse_mac);

    /* If Board 2 (Hardware MAC c8:c9:...) -> Player 2 defaults */
    if (efuse_mac[0] == 0xc8 && efuse_mac[1] == 0xc9) {
        strncpy(cfg->ap_ssid, "MiniConsole-P2", sizeof(cfg->ap_ssid) - 1);
        strncpy(cfg->ap_pass, "12345678", sizeof(cfg->ap_pass) - 1);
        uint8_t joy2_bt_mac[6] = {0x20, 0x00, 0x00, 0x00, 0xAA, 0x02};
        memcpy(cfg->custom_bt_mac, joy2_bt_mac, 6);
        cfg->target_player = 2; /* Player 2 (Joy 2) */
    } else {
        /* Default Board 1 (or primary) -> Player 1 */
        strncpy(cfg->ap_ssid, "MiniConsole-P1", sizeof(cfg->ap_ssid) - 1);
        strncpy(cfg->ap_pass, "12345678", sizeof(cfg->ap_pass) - 1);
        uint8_t joy1_bt_mac[6] = {0x20, 0x00, 0x00, 0x00, 0xAA, 0x01};
        memcpy(cfg->custom_bt_mac, joy1_bt_mac, 6);
        cfg->target_player = 1; /* Player 1 (Joy 1) */
    }
}

esp_err_t app_config_load(app_config_t *cfg)
{
    app_config_init_defaults(&s_cfg);

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_OK) {
        size_t sz = sizeof(app_config_t);
        err = nvs_get_blob(handle, NVS_KEY_BLOB, &s_cfg, &sz);
        nvs_close(handle);
        if (err == ESP_OK && sz == sizeof(app_config_t)) {
            ESP_LOGI(TAG, "Loaded configuration from NVS (AP='%s', STA='%s', WS='%s')",
                     s_cfg.ap_ssid, s_cfg.sta_ssid, s_cfg.ws_server_url);
        } else {
            ESP_LOGW(TAG, "NVS config size mismatch or empty, using defaults");
            app_config_init_defaults(&s_cfg);
        }
    } else {
        ESP_LOGI(TAG, "No saved NVS config yet, using defaults");
    }

    if (s_cfg.send_rate_hz < 10 || s_cfg.send_rate_hz > 100) s_cfg.send_rate_hz = 100;
    if (s_cfg.deadzone > 50) s_cfg.deadzone = 4;
    if (s_cfg.ap_channel < 1 || s_cfg.ap_channel > 13) s_cfg.ap_channel = 6;
    if (s_cfg.target_player < 1 || s_cfg.target_player > 4) s_cfg.target_player = 1;

    /* Set target slot in L2CAP driver for 1 Joystick mode */
    extern void ps3_l2cap_set_target_slot(uint8_t slot);
    ps3_l2cap_set_target_slot(s_cfg.target_player - 1);

    /* Ensure default fixed BT MAC 20:00:00:00:AA:01 if stored custom_bt_mac is all zeros */
    uint8_t zero_mac[6] = {0};
    if (memcmp(s_cfg.custom_bt_mac, zero_mac, 6) == 0) {
        uint8_t default_bt_mac[6] = {0x20, 0x00, 0x00, 0x00, 0xAA, 0x01};
        memcpy(s_cfg.custom_bt_mac, default_bt_mac, 6);
        s_cfg.use_custom_bt_mac = true;
    }

    /* Pure Dynamic Join mode: clear pinned MACs to allow any controller to Join */
    memset(s_cfg.pinned_mac, 0, sizeof(s_cfg.pinned_mac));
    for (uint8_t i = 0; i < 4; i++) {
        ps3MultiSetPinnedMac(i, s_cfg.pinned_mac[i]);
    }

    if (cfg) {
        *cfg = s_cfg;
    }
    return ESP_OK;
}

esp_err_t app_config_save(const app_config_t *cfg)
{
    if (!cfg) return ESP_ERR_INVALID_ARG;
    s_cfg = *cfg;

    for (uint8_t i = 0; i < 4; i++) {
        ps3MultiSetPinnedMac(i, s_cfg.pinned_mac[i]);
    }

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open NVS for write: %s", esp_err_to_name(err));
        return err;
    }

    err = nvs_set_blob(handle, NVS_KEY_BLOB, &s_cfg, sizeof(app_config_t));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }
    nvs_close(handle);
    ESP_LOGI(TAG, "Saved configuration to NVS: %s", esp_err_to_name(err));
    return err;
}

esp_err_t app_config_reset(app_config_t *cfg)
{
    app_config_init_defaults(&s_cfg);
    esp_err_t err = app_config_save(&s_cfg);
    if (cfg) *cfg = s_cfg;
    return err;
}

const app_config_t *app_config_get(void)
{
    return &s_cfg;
}

esp_err_t app_config_update(const app_config_t *new_cfg)
{
    return app_config_save(new_cfg);
}

bool app_parse_mac_str(const char *str, uint8_t mac_out[6])
{
    if (!str || !mac_out) return false;
    unsigned int b[6] = {0};
    int n = sscanf(str, "%02x:%02x:%02x:%02x:%02x:%02x",
                   &b[0], &b[1], &b[2], &b[3], &b[4], &b[5]);
    if (n != 6) {
        n = sscanf(str, "%02x-%02x-%02x-%02x-%02x-%02x",
                   &b[0], &b[1], &b[2], &b[3], &b[4], &b[5]);
    }
    if (n != 6) return false;
    for (int i = 0; i < 6; i++) {
        mac_out[i] = (uint8_t)(b[i] & 0xFF);
    }
    return true;
}

void app_format_mac_str(const uint8_t mac[6], char *str_out, size_t len)
{
    if (!str_out || len < 18) return;
    snprintf(str_out, len, "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

bool app_is_zero_mac(const uint8_t mac[6])
{
    if (!mac) return true;
    for (int i = 0; i < 6; i++) {
        if (mac[i] != 0) return false;
    }
    return true;
}
