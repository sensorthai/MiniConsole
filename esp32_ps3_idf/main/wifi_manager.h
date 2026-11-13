#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "esp_wifi_types.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    bool ap_active;
    char ap_ip[16];
    uint8_t ap_clients;

    bool sta_connected;
    bool sta_connecting;
    char sta_ip[16];
    int8_t sta_rssi;
    char sta_ssid[33];
} wifi_status_info_t;

esp_err_t wifi_manager_init(void);
esp_err_t wifi_manager_apply_config(void);
void wifi_manager_get_status(wifi_status_info_t *status_out);
esp_err_t wifi_manager_scan(wifi_ap_record_t *ap_records, uint16_t *inout_count);

#ifdef __cplusplus
}
#endif

#endif
