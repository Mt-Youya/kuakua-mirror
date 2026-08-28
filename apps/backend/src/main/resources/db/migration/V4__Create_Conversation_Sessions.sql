-- 创建对话会话表
CREATE TABLE IF NOT EXISTS conversation_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_started ON conversation_sessions (device_id, started_at);
CREATE INDEX idx_status ON conversation_sessions (status);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    audio_url VARCHAR(500),
    audio_duration_seconds INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_session_created ON messages (session_id, created_at);
CREATE INDEX idx_device_created ON messages (device_id, created_at);
