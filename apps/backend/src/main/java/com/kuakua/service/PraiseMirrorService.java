package com.kuakua.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 夸夸镜管线服务
 * 负责加载和管理 praise-mirror-pipeline.skill 中的提示词配方
 */
@Slf4j
@Service
public class PraiseMirrorService {

    private final ObjectMapper objectMapper;

    // 三个核心提示词
    private String p1VisualTagsPrompt;
    private String pVoiceInsightsPrompt;
    private String p2PraisePrompt;

    // 验收规则和配置
    private Map<String, Object> config;

    public PraiseMirrorService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        try {
            loadSkillFromResource();
            log.info("夸夸镜管线配方加载成功");
        } catch (IOException e) {
            log.error("加载 praise-mirror-pipeline.skill 失败", e);
        }
    }

    /**
     * 从 resources 下的 .skill 文件（ZIP格式）中加载配方
     */
    private void loadSkillFromResource() throws IOException {
        ClassPathResource resource = new ClassPathResource("praise-mirror-pipeline.skill");

        try (InputStream is = resource.getInputStream();
             ZipInputStream zis = new ZipInputStream(is, StandardCharsets.UTF_8)) {

            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals("SKILL.md")) {
                    String content = new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                    parseSkillMarkdown(content);
                    break;
                }
            }
        }
    }

    /**
     * 解析 SKILL.md 提取提示词
     */
    private void parseSkillMarkdown(String markdown) {
        // 提取 P1 视觉标签提示词
        p1VisualTagsPrompt = extractPromptSection(markdown,
            "### P1 视觉标签提取（system prompt）", "### P_voice");

        // 提取 P_voice 对话洞察提示词
        pVoiceInsightsPrompt = extractPromptSection(markdown,
            "### P_voice 对话洞察（system prompt）", "### P2");

        // 提取 P2 融合夸夸提示词
        p2PraisePrompt = extractPromptSection(markdown,
            "### P2 融合夸夸（system prompt）", "## 输出闸门");

        // 初始化配置
        config = new HashMap<>();
        config.put("maxLength", 22);
        config.put("temperature_p1", 0.7);
        config.put("temperature_p_voice", 0.5);
        config.put("temperature_p2", 0.95);
        config.put("max_tokens_p1", 300);
        config.put("max_tokens_p_voice", 300);
        config.put("max_tokens_p2", 40);
    }

    /**
     * 提取 markdown 中指定章节的内容
     */
    private String extractPromptSection(String markdown, String startMarker, String endMarker) {
        int start = markdown.indexOf(startMarker);
        if (start == -1) return "";

        start = markdown.indexOf("\n", start) + 1;
        int end = markdown.indexOf(endMarker, start);
        if (end == -1) end = markdown.length();

        String section = markdown.substring(start, end).trim();

        // 移除代码块标记
        section = section.replaceAll("^```\\w*\\n|\\n```$", "").trim();

        // 提取实际的提示词内容（去掉说明文字）
        int promptStart = section.indexOf("你是");
        if (promptStart != -1) {
            section = section.substring(promptStart);
        }

        return section.trim();
    }

    /**
     * 获取 P1 视觉标签提取提示词
     */
    public String getP1VisualTagsPrompt() {
        return p1VisualTagsPrompt;
    }

    /**
     * 获取 P_voice 对话洞察提示词（需要替换 dialogue_text 占位符）
     */
    public String getPVoiceInsightsPrompt(String dialogueText) {
        if (dialogueText == null || dialogueText.length() < 5) {
            return null; // 对话太短，不跑 P_voice
        }

        // 截断到 500 字
        String truncated = dialogueText.length() > 500
            ? dialogueText.substring(0, 500)
            : dialogueText;

        return pVoiceInsightsPrompt.replace("{dialogue_text}", truncated);
    }

    /**
     * 获取 P2 融合夸夸提示词（需要替换占位符）
     */
    public String getP2PraisePrompt(JsonNode visualTags, JsonNode voiceInsights, String dialogueText) {
        String prompt = p2PraisePrompt;

        // 替换视觉标签
        prompt = prompt.replace("{visual_tags}",
            visualTags != null ? visualTags.toString() : "{\"blurry\": true, \"expression\": [\"无法辨认\"]}");

        // 构建用户画像
        StringBuilder userProfile = new StringBuilder();
        if (voiceInsights != null) {
            userProfile.append(voiceInsights.toString()).append("\n");
        }
        if (dialogueText != null && !dialogueText.isEmpty()) {
            userProfile.append("她刚才说: \"").append(dialogueText).append("\"");
        }

        prompt = prompt.replace("{user_profile}",
            userProfile.length() > 0 ? userProfile.toString() : "无");

        return prompt;
    }

    /**
     * 验证夸夸句是否符合规范
     * @return 错误提示列表，空列表表示通过
     */
    public java.util.List<String> validatePraise(String praise) {
        java.util.List<String> errors = new java.util.ArrayList<>();

        // 清理
        String cleaned = praise.replaceAll("[\\[\\]\"「」《》]", "")
                              .replaceAll("\\s+", "")
                              .replace("专注度", "专注")
                              .replace("敞亮", "好看")
                              .replace("氛围感", "感觉")
                              .replaceAll("让人觉得|让人感到", "真的好")
                              .replaceAll("给人(一种)?", "");

        // 1. 字数检查（不含标点）
        String noPunctuation = cleaned.replaceAll("[，。！？、,\\.!?]", "");
        if (noPunctuation.length() > 22) {
            errors.add("超过字数，必须20字以内");
        }

        // 2. 必须含"我"或"自己"
        if (!cleaned.contains("我") && !cleaned.contains("自己")) {
            errors.add("句子里必须有'我'或'自己'");
        }

        // 3. 不含"你"
        if (cleaned.contains("你")) {
            errors.add("不许出现'你'字");
        }

        // 4. 不含建议词
        String[] suggestionWords = {"可以", "试试", "应该", "加油", "建议", "记得", "别忘"};
        for (String word : suggestionWords) {
            if (cleaned.contains(word)) {
                errors.add("有建议词，只夸不建议");
                break;
            }
        }

        // 5. 不含套话
        String[] cliches = {"看起来不错", "状态很好", "今天也要", "心情不错"};
        for (String cliche : cliches) {
            if (cleaned.contains(cliche)) {
                errors.add("是套话，要更具体");
                break;
            }
        }

        // 6. 不夸物品
        Pattern itemPattern = Pattern.compile("我的(耳环|项链|手链|戒指|手表|眼镜|帽子|包包|鞋子).{0,2}好");
        if (itemPattern.matcher(cleaned).find()) {
            errors.add("夸了物品，要夸人");
        }

        // 7. 不含禁用词
        String[] bannedWords = {"魅力", "迷人", "性感", "有吸引力", "让人心动", "令人着迷",
                                "有气质", "好看死了", "美翻了", "温柔", "俏皮"};
        for (String word : bannedWords) {
            if (cleaned.contains(word)) {
                errors.add("有禁用词");
                break;
            }
        }

        // 8. 不中句式套路
        Pattern routinePattern = Pattern.compile("我.{1,6}的样子好.{1,4}[！!]");
        if (routinePattern.matcher(cleaned).find()) {
            errors.add("句式套路，换说法");
        }

        // 9. 不含观后感词
        if (cleaned.contains("感觉") || cleaned.contains("觉得")) {
            errors.add("是观后感不是夸，改成肯定判断");
        }

        return errors;
    }

    /**
     * 获取兜底句（随机）
     */
    public String getFallbackPraise() {
        String[] fallbacks = {
            "我又见面啦！",
            "每次照镜子都有新发现！",
            "今天也是独一无二的我！"
        };
        return fallbacks[(int) (Math.random() * fallbacks.length)];
    }

    /**
     * 构建重跑指令
     */
    public String buildRetryInstruction(String failedPraise, java.util.List<String> errors) {
        return String.format(
            "## 重跑指令\n" +
            "上一句「%s」作废，不许复用或改写它。本次必须修正：%s。" +
            "记住：夸是对自己的肯定判断，不是打气口号。只输出一句话。",
            failedPraise,
            String.join("；", errors)
        );
    }

    public Map<String, Object> getConfig() {
        return config;
    }
}
