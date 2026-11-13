#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    /* WiFi SoftAP Config (Web UI Portal) */
    char ap_ssid[33];
    char ap_pass[65];
    uint8_t ap_channel;

    /* WiFi Station Config (Connect to Router / Game Network) */
    bool sta_enabled;
    char sta_ssid[33];
    char sta_pass[65];

    /* Game App WebSocket Server Config */
    bool ws_client_enabled;
    char ws_server_url[128];   /* e.g. ws://192.168.1.100:8080/ws */
    uint8_t send_rate_hz;      /* 20 .. 100 Hz (default 60 Hz) */
    uint8_t deadzone;          /* Analog stick deadzone 0 .. 40 (default 8) */

    /* PS3 Bluetooth Config */
    bool use_custom_bt_mac;
    uint8_t custom_bt_mac[6];  /* Optional custom BT Master MAC for Sixaxis pairing */
    uint8_t pinned_mac[4][6];  /* Optional MAC pin per player slot P1..P4 */
    uint8_t target_player;     /* 1..4: Target Player role for 1 Joystick mode (P1, P2, P3, P4) */
} app_config_t;

void app_config_init_defaults(app_config_t *cfg);
esp_err_t app_config_load(app_config_t *cfg);
esp_err_t app_config_save(const app_config_t *cfg);
esp_err_t app_config_reset(app_config_t *cfg);

const app_config_t *app_config_get(void);
esp_err_t app_config_update(const app_config_t *new_cfg);

bool app_parse_mac_str(const char *str, uint8_t mac_out[6]);
void app_format_mac_str(const uint8_t mac[6], char *str_out, size_t len);
bool app_is_zero_mac(const uint8_t mac[6]);

#ifdef __cplusplus
}
#endif

#endif
