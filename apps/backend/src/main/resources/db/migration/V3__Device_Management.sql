-- 设备管理表
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(64) PRIMARY KEY,
    activation_code VARCHAR(32) NOT NULL,
    model VARCHAR(64) NOT NULL,
    serial_number VARCHAR(64) NOT NULL,
    firmware_version VARCHAR(32) NOT NULL,
    mac_address VARCHAR(32),
    device_token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMP,
    activated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activation_code)
);

-- 设备配置表
CREATE TABLE IF NOT EXISTS device_configs (
    device_id VARCHAR(64) PRIMARY KEY,
    volume INT NOT NULL DEFAULT 50,
    brightness INT NOT NULL DEFAULT 80,
    wake_word VARCHAR(64) NOT NULL DEFAULT '你好镜子',
    language VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    auto_update BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- 设备日志表
CREATE TABLE IF NOT EXISTS device_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    level VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_timestamp ON device_logs (device_id, timestamp);
CREATE INDEX idx_level ON device_logs (level);

-- OTA更新记录表
CREATE TABLE IF NOT EXISTS ota_updates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    from_version VARCHAR(32) NOT NULL,
    to_version VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    progress INT DEFAULT 0,
    error TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_status ON ota_updates (device_id, status);

-- 设备图片表
CREATE TABLE IF NOT EXISTS device_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(64) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_uploaded ON device_images (device_id, uploaded_at);
