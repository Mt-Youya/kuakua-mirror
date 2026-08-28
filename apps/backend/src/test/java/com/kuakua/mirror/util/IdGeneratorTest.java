package com.kuakua.mirror.util;

import com.kuakua.mirror.shared.util.IdGenerator;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IdGeneratorTest {

    @Test
    void testGenerateEventId() {
        String eventId = IdGenerator.generateEventId();
        assertNotNull(eventId);
        assertTrue(eventId.startsWith("event_"));
        assertEquals(38, eventId.length()); // "event_" + 32 chars
    }

    @Test
    void testGenerateSessionId() {
        String sessionId = IdGenerator.generateSessionId();
        assertNotNull(sessionId);
        assertTrue(sessionId.startsWith("sess_"));
        assertEquals(37, sessionId.length()); // "sess_" + 32 chars
    }

    @Test
    void testGenerateItemId() {
        String itemId = IdGenerator.generateItemId();
        assertNotNull(itemId);
        assertTrue(itemId.startsWith("item_"));
        assertEquals(37, itemId.length()); // "item_" + 32 chars
    }

    @Test
    void testGenerateResponseId() {
        String responseId = IdGenerator.generateResponseId();
        assertNotNull(responseId);
        assertTrue(responseId.startsWith("resp_"));
        assertEquals(37, responseId.length()); // "resp_" + 32 chars
    }

    @Test
    void testIdUniqueness() {
        String id1 = IdGenerator.generateEventId();
        String id2 = IdGenerator.generateEventId();
        assertNotEquals(id1, id2);
    }
}
