#pragma once
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t app_mdns_init(const char *ap_ssid);
esp_err_t app_mdns_set_hostname_from_ssid(const char *ap_ssid);
const char *app_mdns_get_hostname(void);

#ifdef __cplusplus
}
#endif
