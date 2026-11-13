#ifndef WS_BRIDGE_H
#define WS_BRIDGE_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "esp_http_server.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    bool client_enabled;
    bool client_connected;
    char server_url[128];
    uint32_t tx_packets;
    uint32_t rx_packets;
    int direct_ws_clients;
} ws_bridge_status_t;

esp_err_t ws_bridge_init(void);
esp_err_t ws_bridge_restart_client(void);
void ws_bridge_get_status(ws_bridge_status_t *status_out);

/* Called by web_server when a browser connects to /ws or port 81 */
void ws_bridge_register_httpd(httpd_handle_t server);
esp_err_t ws_bridge_ws_handler(httpd_req_t *req);

/* Handle incoming JSON command (rumble / led / test) */
void ws_bridge_handle_incoming_json(const char *json_str, size_t len);

/* Send a single test/simulated pad packet to verify Game App Server connection */
void ws_bridge_send_test_packet(uint8_t slot);

/* Build bitmask matching JS PS3Buttons from ps3_button_t */
uint32_t ws_bridge_encode_buttons(uint8_t slot);

#ifdef __cplusplus
}
#endif

#endif
