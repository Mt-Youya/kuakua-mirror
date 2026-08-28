package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 历史数据查询响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryQueryResponse {

    private List<HistoryRecord> records;

    private Pagination pagination;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryRecord {
        private Long timestamp;
        private String type;
        private Object data;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pagination {
        private Integer total;
        private Integer limit;
        private Integer offset;
    }
}
