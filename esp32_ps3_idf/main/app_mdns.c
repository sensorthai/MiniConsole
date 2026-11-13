#include "app_mdns.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "mdns.h"

#define TAG "APP_MDNS"

static char s_current_hostname[64] = "MiniConsole-PS3";
static bool s_mdns_initialized = false;

static void sanitize_hostname(const char *src, char *dst, size_t max_len)
{
    if (!src || strlen(src) == 0 || max_len < 2) {
        snprintf(dst, max_len, "MiniConsole-PS3");
        return;
    }

    size_t out_idx = 0;
    for (size_t i = 0; src[i] != '\0' && out_idx < max_len - 1; i++) {
        char c = src[i];
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-') {
            dst[out_idx++] = c;
        } else if (c == ' ' || c == '_' || c == '.') {
            if (out_idx > 0 && dst[out_idx - 1] != '-') {
                dst[out_idx++] = '-';
            }
        }
    }
    while (out_idx > 0 && dst[out_idx - 1] == '-') {
        out_idx--;
    }
    dst[out_idx] = '\0';

    if (strlen(dst) == 0) {
        snprintf(dst, max_len, "MiniConsole-PS3");
    }
}

esp_err_t app_mdns_init(const char *ap_ssid)
{
    if (!s_mdns_initialized) {
        esp_err_t err = mdns_init();
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "mdns_init failed: %s", esp_err_to_name(err));
            return err;
        }
        s_mdns_initialized = true;
    }

    app_mdns_set_hostname_from_ssid(ap_ssid);
    mdns_service_add("MiniConsole-Web", "_http", "_tcp", 80, NULL, 0);
    return ESP_OK;
}

esp_err_t app_mdns_set_hostname_from_ssid(const char *ap_ssid)
{
    sanitize_hostname(ap_ssid, s_current_hostname, sizeof(s_current_hostname));
    esp_err_t err = mdns_hostname_set(s_current_hostname);
    if (err == ESP_OK) {
        char inst[128];
        snprintf(inst, sizeof(inst), "%s Gamepad Bridge", s_current_hostname);
        mdns_instance_name_set(inst);
        ESP_LOGI(TAG, "mDNS Hostname updated to '%s' (http://%s.local) matching AP SSID '%s'",
                 s_current_hostname, s_current_hostname, ap_ssid ? ap_ssid : "");
    } else {
        ESP_LOGE(TAG, "Failed to set mDNS hostname '%s': %s", s_current_hostname, esp_err_to_name(err));
    }
    return err;
}

const char *app_mdns_get_hostname(void)
{
    return s_current_hostname;
}
