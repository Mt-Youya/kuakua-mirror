package com.kuakua.mirror.conversation.infra;

import com.kuakua.mirror.conversation.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    List<Message> findByDeviceIdOrderByCreatedAtDesc(String deviceId);
    List<Message> findByMomentIdOrderByCreatedAtAsc(Long momentId);
    long countBySessionId(String sessionId);
}
