package com.kuakua.mirror.conversation.infra;

import com.kuakua.mirror.conversation.domain.ConversationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 对话会话Repository
 */
@Repository
public interface ConversationSessionRepository extends JpaRepository<ConversationSession, String> {

    List<ConversationSession> findByDeviceIdOrderByStartedAtDesc(String deviceId);

    Optional<ConversationSession> findByDeviceIdAndStatus(String deviceId, ConversationSession.SessionStatus status);

    List<ConversationSession> findByStatus(ConversationSession.SessionStatus status);
}
