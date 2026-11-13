#include "ws_bridge.h"
#include "app_config.h"
#include "ps3.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_websocket_client.h"
#include "cJSON.h"

#define TAG "WS_BRIDGE"

/* Bitmask matching js/config.js PS3Buttons */
#define BTN_CROSS    (1UL << 0)
#define BTN_CIRCLE   (1UL << 1)
#define BTN_SQUARE   (1UL << 2)
#define BTN_TRIANGLE (1UL << 3)
#define BTN_L1       (1UL << 4)
#define BTN_R1       (1UL << 5)
#define BTN_L2       (1UL << 6)
#define BTN_R2       (1UL << 7)
#define BTN_SELECT   (1UL << 8)
#define BTN_START    (1UL << 9)
#define BTN_L3       (1UL << 10)
#define BTN_R3       (1UL << 11)
#define BTN_UP       (1UL << 12)
#define BTN_DOWN     (1UL << 13)
#define BTN_LEFT     (1UL << 14)
#define BTN_RIGHT    (1UL << 15)
#define BTN_PS       (1UL << 16)

#define MAX_DIRECT_WS_CLIENTS 8

static esp_websocket_client_handle_t s_ws_client = NULL;
static bool s_ws_client_connected = false;
static uint32_t s_tx_packets = 0;
static uint32_t s_rx_packets = 0;

typedef struct {
    httpd_handle_t hd;
    int fd;
    bool active;
} direct_ws_client_t;

static direct_ws_client_t s_direct_clients[MAX_DIRECT_WS_CLIENTS];
static httpd_handle_t s_httpd_81 = NULL;

static int8_t apply_deadzone(int8_t val, uint8_t dz)
{
    int v = (int)val;
    if (v > -(int)dz && v < (int)dz) return 0;
    if (v < -127) v = -127;
    if (v > 127)  v = 127;
    return (int8_t)v;
}

uint32_t ws_bridge_encode_buttons(uint8_t slot)
{
    ps3_slot_info_t info;
    if (!ps3MultiGetSlotInfo(slot, &info) || !info.is_active) return 0;

    uint32_t b = 0;
    const ps3_button_t *btn = &info.state.button;
    if (btn->cross)    b |= BTN_CROSS;
    if (btn->circle)   b |= BTN_CIRCLE;
    if (btn->square)   b |= BTN_SQUARE;
    if (btn->triangle) b |= BTN_TRIANGLE;
    if (btn->l1)       b |= BTN_L1;
    if (btn->r1)       b |= BTN_R1;
    if (btn->l2)       b |= BTN_L2;
    if (btn->r2)       b |= BTN_R2;
    if (btn->select)   b |= BTN_SELECT;
    if (btn->start)    b |= BTN_START;
    if (btn->l3)       b |= BTN_L3;
    if (btn->r3)       b |= BTN_R3;
    if (btn->up)       b |= BTN_UP;
    if (btn->down)     b |= BTN_DOWN;
    if (btn->left)     b |= BTN_LEFT;
    if (btn->right)    b |= BTN_RIGHT;
    if (btn->ps)       b |= BTN_PS;
    return b;
}

static void add_direct_ws_client(httpd_handle_t hd, int fd)
{
    for (int i = 0; i < MAX_DIRECT_WS_CLIENTS; i++) {
        if (s_direct_clients[i].active && s_direct_clients[i].hd == hd && s_direct_clients[i].fd == fd) {
            return;
        }
    }
    for (int i = 0; i < MAX_DIRECT_WS_CLIENTS; i++) {
        if (!s_direct_clients[i].active) {
            s_direct_clients[i].hd = hd;
            s_direct_clients[i].fd = fd;
            s_direct_clients[i].active = true;
            ESP_LOGI(TAG, "Direct WebSocket client connected (fd=%d)", fd);
            return;
        }
    }
}

static void broadcast_to_all_ws(const char *msg, size_t len)
{
    /* 1. Send to outbound Game App Server via esp_websocket_client */
    if (s_ws_client && s_ws_client_connected && esp_websocket_client_is_connected(s_ws_client)) {
        int sent = esp_websocket_client_send_text(s_ws_client, msg, len, pdMS_TO_TICKS(15));
        if (sent >= 0) {
            s_tx_packets++;
        }
    }

    /* 2. Broadcast to any browser connected directly to ESP32 WS Server (/ws or :81) */
    httpd_ws_frame_t ws_pkt = {
        .final = true,
        .fragmented = false,
        .type = HTTPD_WS_TYPE_TEXT,
        .payload = (uint8_t *)msg,
        .len = len
    };

    for (int i = 0; i < MAX_DIRECT_WS_CLIENTS; i++) {
        if (s_direct_clients[i].active) {
            if (httpd_ws_get_fd_info(s_direct_clients[i].hd, s_direct_clients[i].fd) != HTTPD_WS_CLIENT_WEBSOCKET) {
                s_direct_clients[i].active = false;
                continue;
            }
            esp_err_t err = httpd_ws_send_frame_async(s_direct_clients[i].hd, s_direct_clients[i].fd, &ws_pkt);
            if (err != ESP_OK) {
                s_direct_clients[i].active = false;
            } else {
                s_tx_packets++;
            }
        }
    }
}

void ws_bridge_handle_incoming_json(const char *json_str, size_t len)
{
    if (!json_str || len == 0) return;
    s_rx_packets++;

    cJSON *root = cJSON_ParseWithLength(json_str, len);
    if (!root) return;

    cJSON *type = cJSON_GetObjectItem(root, "t");
    if (cJSON_IsString(type) && type->valuestring) {
        if (strcmp(type->valuestring, "rumble") == 0) {
            int p  = cJSON_GetObjectItem(root, "p")  ? cJSON_GetObjectItem(root, "p")->valueint  : 1;
            int l  = cJSON_GetObjectItem(root, "l")  ? cJSON_GetObjectItem(root, "l")->valueint  : 128;
            int r  = cJSON_GetObjectItem(root, "r")  ? cJSON_GetObjectItem(root, "r")->valueint  : 128;
            int ms = cJSON_GetObjectItem(root, "ms") ? cJSON_GetObjectItem(root, "ms")->valueint : 200;

            /* Support both 1-based (p=1..4) and 0-based (p=0..3) player index */
            uint8_t slot = (p >= 1 && p <= 4) ? (uint8_t)(p - 1) : (uint8_t)(p & 0x03);
            uint8_t ticks = (uint8_t)((ms / 10) > 255 ? 255 : (ms / 10 < 1 ? 10 : ms / 10));
            uint8_t l_int = (uint8_t)(l > 255 ? 255 : (l < 0 ? 0 : l));
            uint8_t r_int = (uint8_t)(r > 255 ? 255 : (r < 0 ? 0 : r));

            ps3MultiRumble(slot, l_int, ticks, r_int, ticks);
        } else if (strcmp(type->valuestring, "led") == 0) {
            int p   = cJSON_GetObjectItem(root, "p")   ? cJSON_GetObjectItem(root, "p")->valueint   : 1;
            int led = cJSON_GetObjectItem(root, "led") ? cJSON_GetObjectItem(root, "led")->valueint : p;
            uint8_t slot = (p >= 1 && p <= 4) ? (uint8_t)(p - 1) : (uint8_t)(p & 0x03);
            ps3MultiSetLed(slot, (uint8_t)led);
        }
    }

    cJSON_Delete(root);
}

static void websocket_client_event_handler(void *handler_args, esp_event_base_t base,
                                           int32_t event_id, void *event_data)
{
    (void)handler_args;
    (void)base;
    esp_websocket_event_data_t *data = (esp_websocket_event_data_t *)event_data;
    switch (event_id) {
        case WEBSOCKET_EVENT_CONNECTED: {
            s_ws_client_connected = true;
            ESP_LOGI(TAG, "Connected to Game App WebSocket Server!");
            const char *hello = "{\"t\":\"hello\",\"role\":\"esp32_ps3_bridge\",\"max_pads\":4}";
            esp_websocket_client_send_text(s_ws_client, hello, strlen(hello), pdMS_TO_TICKS(50));
            break;
        }
        case WEBSOCKET_EVENT_DISCONNECTED:
            s_ws_client_connected = false;
            ESP_LOGW(TAG, "Disconnected from Game App WebSocket Server");
            break;
        case WEBSOCKET_EVENT_DATA:
            if (data->op_code == 0x01 && data->data_len > 0 && data->data_ptr) {
                ws_bridge_handle_incoming_json((const char *)data->data_ptr, data->data_len);
            }
            break;
        case WEBSOCKET_EVENT_ERROR:
            s_ws_client_connected = false;
            break;
        default:
            break;
    }
}

esp_err_t ws_bridge_restart_client(void)
{
    if (s_ws_client) {
        s_ws_client_connected = false;
        esp_websocket_client_stop(s_ws_client);
        esp_websocket_client_destroy(s_ws_client);
        s_ws_client = NULL;
    }

    const app_config_t *cfg = app_config_get();
    if (!cfg->ws_client_enabled || strlen(cfg->ws_server_url) < 6) {
        ESP_LOGI(TAG, "Outbound WebSocket Client disabled or empty URL");
        return ESP_OK;
    }

    esp_websocket_client_config_t ws_cfg = {
        .uri = cfg->ws_server_url,
        .disable_auto_reconnect = false,
        .buffer_size = 1024,
        .ping_interval_sec = 10,
    };

    s_ws_client = esp_websocket_client_init(&ws_cfg);
    if (!s_ws_client) {
        ESP_LOGE(TAG, "Failed to init WebSocket client for URL: %s", cfg->ws_server_url);
        return ESP_FAIL;
    }

    esp_websocket_register_events(s_ws_client, WEBSOCKET_EVENT_ANY, websocket_client_event_handler, NULL);
    esp_err_t err = esp_websocket_client_start(s_ws_client);
    ESP_LOGI(TAG, "Started Outbound WebSocket Client -> %s (%s)", cfg->ws_server_url, esp_err_to_name(err));
    return err;
}

esp_err_t ws_bridge_ws_handler(httpd_req_t *req)
{
    if (req->method == HTTP_GET) {
        int fd = httpd_req_to_sockfd(req);
        add_direct_ws_client(req->handle, fd);
        return ESP_OK;
    }

    httpd_ws_frame_t ws_pkt;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;

    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 0);
    if (ret != ESP_OK) return ret;

    if (ws_pkt.len > 0 && ws_pkt.len < 512) {
        uint8_t *buf = calloc(1, ws_pkt.len + 1);
        if (buf) {
            ws_pkt.payload = buf;
            ret = httpd_ws_recv_frame(req, &ws_pkt, ws_pkt.len);
            if (ret == ESP_OK && ws_pkt.type == HTTPD_WS_TYPE_TEXT) {
                ws_bridge_handle_incoming_json((const char *)buf, ws_pkt.len);
            }
            free(buf);
        }
    }
    return ESP_OK;
}

void ws_bridge_register_httpd(httpd_handle_t server)
{
    static const httpd_uri_t ws_uri = {
        .uri        = "/ws",
        .method     = HTTP_GET,
        .handler    = ws_bridge_ws_handler,
        .user_ctx   = NULL,
        .is_websocket = true
    };
    httpd_register_uri_handler(server, &ws_uri);
}

static void start_port81_ws_server(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 81;
    config.ctrl_port = 32769;
    config.max_open_sockets = 6;

    if (httpd_start(&s_httpd_81, &config) == ESP_OK) {
        static const httpd_uri_t ws_root_uri = {
            .uri        = "/",
            .method     = HTTP_GET,
            .handler    = ws_bridge_ws_handler,
            .user_ctx   = NULL,
            .is_websocket = true
        };
        static const httpd_uri_t ws_sub_uri = {
            .uri        = "/ws",
            .method     = HTTP_GET,
            .handler    = ws_bridge_ws_handler,
            .user_ctx   = NULL,
            .is_websocket = true
        };
        httpd_register_uri_handler(s_httpd_81, &ws_root_uri);
        httpd_register_uri_handler(s_httpd_81, &ws_sub_uri);
        ESP_LOGI(TAG, "Direct WebSocket Server listening on ws://192.168.4.1:81/");
    }
}

void ws_bridge_send_test_packet(uint8_t slot)
{
    if (slot >= PS3_MAX_CONTROLLERS) slot = 0;
    char buf[160];
    int len = snprintf(buf, sizeof(buf),
                       "{\"t\":\"pad\",\"p\":%d,\"lx\":0,\"ly\":-95,\"rx\":0,\"ry\":0,\"l2\":0,\"r2\":255,\"b\":1,\"bat\":5}",
                       slot);
    if (len > 0) {
        broadcast_to_all_ws(buf, (size_t)len);
    }
}

static void on_ps3_multi_connection(uint8_t slot, uint8_t is_connected, const uint8_t bd_addr[6])
{
    ESP_LOGI(TAG, "PS3 Slot P%d (%02X:%02X:%02X:%02X:%02X:%02X) %s",
             slot + 1,
             bd_addr[0], bd_addr[1], bd_addr[2], bd_addr[3], bd_addr[4], bd_addr[5],
             is_connected ? "CONNECTED" : "DISCONNECTED");

    if (!is_connected) {
        /* Notify Game App Server & Browser that slot P(slot) disconnected (bat: -1) */
        char buf[128];
        int len = snprintf(buf, sizeof(buf),
                           "{\"t\":\"pad\",\"p\":%d,\"lx\":0,\"ly\":0,\"rx\":0,\"ry\":0,\"l2\":0,\"r2\":0,\"b\":0,\"bat\":-1}",
                           slot);
        if (len > 0) {
            broadcast_to_all_ws(buf, (size_t)len);
        }
    }
}

static void ws_streamer_task(void *arg)
{
    (void)arg;
    char buf[160];

    while (1) {
        const app_config_t *cfg = app_config_get();
        uint8_t rate_hz = (cfg->send_rate_hz >= 10 && cfg->send_rate_hz <= 100) ? cfg->send_rate_hz : 60;
        uint8_t dz = cfg->deadzone;

        for (uint8_t slot = 0; slot < PS3_MAX_CONTROLLERS; slot++) {
            ps3_slot_info_t info;
            if (ps3MultiGetSlotInfo(slot, &info) && info.in_use && info.is_active) {
                int8_t lx = apply_deadzone(info.state.analog.stick.lx, dz);
                int8_t ly = apply_deadzone(info.state.analog.stick.ly, dz);
                int8_t rx = apply_deadzone(info.state.analog.stick.rx, dz);
                int8_t ry = apply_deadzone(info.state.analog.stick.ry, dz);
                uint8_t l2 = info.state.analog.button.l2;
                uint8_t r2 = info.state.analog.button.r2;
                uint32_t b = ws_bridge_encode_buttons(slot);
                int bat = (int)info.state.status.battery;

                int len = snprintf(buf, sizeof(buf),
                                   "{\"t\":\"pad\",\"p\":%d,\"lx\":%d,\"ly\":%d,\"rx\":%d,\"ry\":%d,\"l2\":%u,\"r2\":%u,\"b\":%u,\"bat\":%d}",
                                   slot, (int)lx, (int)ly, (int)rx, (int)ry,
                                   (unsigned)l2, (unsigned)r2, (unsigned)b, bat);
                if (len > 0) {
                    broadcast_to_all_ws(buf, (size_t)len);
                }
            }
        }

        vTaskDelay(pdMS_TO_TICKS(1000 / rate_hz));
    }
}

esp_err_t ws_bridge_init(void)
{
    memset(s_direct_clients, 0, sizeof(s_direct_clients));
    ps3MultiSetConnectionCallback(on_ps3_multi_connection);

    start_port81_ws_server();
    ws_bridge_restart_client();

    xTaskCreatePinnedToCore(ws_streamer_task, "ws_streamer", 4096, NULL, 6, NULL, 1);
    return ESP_OK;
}

void ws_bridge_get_status(ws_bridge_status_t *status_out)
{
    if (!status_out) return;
    const app_config_t *cfg = app_config_get();
    status_out->client_enabled = cfg->ws_client_enabled;
    status_out->client_connected = s_ws_client_connected && s_ws_client && esp_websocket_client_is_connected(s_ws_client);
    strncpy(status_out->server_url, cfg->ws_server_url, sizeof(status_out->server_url) - 1);
    status_out->tx_packets = s_tx_packets;
    status_out->rx_packets = s_rx_packets;

    int direct_cnt = 0;
    for (int i = 0; i < MAX_DIRECT_WS_CLIENTS; i++) {
        if (s_direct_clients[i].active) direct_cnt++;
    }
    status_out->direct_ws_clients = direct_cnt;
}
