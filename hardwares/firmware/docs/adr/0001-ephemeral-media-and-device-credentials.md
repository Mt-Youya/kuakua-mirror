# Keep K10 media ephemeral and rotate bootstrap credentials into NVS

The K10 sends photos and recordings directly to the KuaKua API and frees them after each request; it does not keep a local media history. A first-boot bootstrap credential is injected only from the local environment, rotated through the deployed backend, and the replacement is retained in NVS so the repository does not contain a production credential.
