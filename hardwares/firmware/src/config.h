#pragma once

#ifndef K10_WIFI_SSID
#define K10_WIFI_SSID ""
#endif

#ifndef K10_WIFI_PASSWORD
#define K10_WIFI_PASSWORD ""
#endif

#ifndef K10_BOOTSTRAP_DEVICE_ID
#define K10_BOOTSTRAP_DEVICE_ID ""
#endif

#ifndef K10_BOOTSTRAP_TOKEN
#define K10_BOOTSTRAP_TOKEN ""
#endif

#ifndef K10_ACTIVATION_CODE
#define K10_ACTIVATION_CODE ""
#endif

#define SERVER_HOST "https://kuakua-api.cyrusdoyle.me"
#define SERVER_DOMAIN "kuakua-api.cyrusdoyle.me"
#define K10_DEVICE_MODEL "K10"
#define K10_DEVICE_SERIAL "49275321061180"
#define K10_FIRMWARE_VERSION "1.0.0"
#define API_HEALTH "/api/health"
#define API_PRAISE_STREAM "/api/v1/praise/stream"
#define API_CHAT_STREAM "/api/v1/chat/stream"
#define API_TTS "/api/v1/tts"
#define API_AUDIO_BASE "/api/v1/audio/"

#define HTTP_TIMEOUT_MS 60000
#define WIFI_CONNECT_RETRY 20
#define FIRST_TOKEN_TIMEOUT_MS 30000
#define TOTAL_STREAM_TIMEOUT_MS 60000
#define SAMPLE_RATE 16000
#define RECORD_DURATION_MS 3000
#define MAX_IMAGE_BYTES (500 * 1024)
#define MAX_AUDIO_BYTES (1024 * 1024)
#define MAX_TTS_BYTES (1024 * 1024)
#define LONG_PRESS_MS 800
#define RESPONSE_HOLD_MS 5000
#define STREAM_CHAR_DELAY 80

#define I2S_MCLK 3
#define I2S_BCLK 0
#define I2S_LRCK 38
#define I2S_DIN 39
#define I2S_DOUT 45
#define I2S_PORT I2S_NUM_0

#define COL_BG 0xF6F3EC
#define COL_INK 0x2E3238
#define COL_SILVER 0xA9B1B9
#define COL_GREY 0x8E979F
#define COL_DIM 0x98A1A9
#define COL_HAIRLINE 0xDAD6CC
#define COL_ACCENT 0xA5BCCF
#define COL_ACCENT_DARK 0x7E99AD
#define COL_OFFLINE_TEXT 0x8FA8BC
#define COL_ERR 0xC0655A
#define COL_EYE 0xF4F0E9
#define COL_SILVER_LIT 0xC4CBD1
#define COL_HALO_INNER 0xD8E2EC
#define COL_HALO_OUTER 0xC6D5E2
#define COL_HAIRLINE_LIT 0xE8E4DA
#define HUG_STEP_MS 140
#define HUG_TEXT_CHAR_MS 180
#define HUG_HOLD_MS 1800
#define HUG_BREATH_MS 750
#define HUG_HALO_DELAY 280
