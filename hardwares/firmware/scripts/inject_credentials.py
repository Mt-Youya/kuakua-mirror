Import("env")

import os

for name in (
    "K10_WIFI_SSID",
    "K10_WIFI_PASSWORD",
    "K10_BOOTSTRAP_DEVICE_ID",
    "K10_BOOTSTRAP_TOKEN",
    "K10_ACTIVATION_CODE",
):
    value = os.getenv(name)
    if value:
        env.Append(CPPDEFINES=[(name, '\\"%s\\"' % value.replace('\\', '\\\\').replace('"', '\\"'))])
