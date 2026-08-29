package com.kuakua.mirror.praise;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 夸夸镜提示词服务
 * 从 praise-mirror-pipeline.skill 加载三阶段提示词
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PraiseMirrorPromptService {

    private final ObjectMapper objectMapper;

    // 三个核心提示词
    private String p1VisualPrompt;
    private String pVoicePrompt;
    private String p2PraisePrompt;

    @PostConstruct
    public void init() {
        try {
            loadPromptsFromSkill();
            log.info("夸夸镜管线提示词加载成功");
        } catch (IOException e) {
            log.error("加载 praise-mirror-pipeline.skill 失败", e);
        }
    }

    /**
     * 从 skill 文件加载提示词
     */
    private void loadPromptsFromSkill() throws IOException {
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
        // P1 视觉标签提取
        p1VisualPrompt = extractPromptByHeader(markdown, "### P1 视觉标签提取（system prompt）");

        // P_voice 对话洞察
        pVoicePrompt = extractPromptByHeader(markdown, "### P_voice 对话洞察（system prompt）");

        // P2 融合夸夸
        p2PraisePrompt = extractPromptByHeader(markdown, "### P2 融合夸夸（system prompt）");
    }

    /**
     * 根据标题提取提示词内容
     */
    private String extractPromptByHeader(String markdown, String header) {
        int start = markdown.indexOf(header);
        if (start == -1) {
            log.warn("找不到提示词章节: {}", header);
            return "";
        }

        // 跳过标题行
        start = markdown.indexOf("\n", start) + 1;

        // 找到下一个三级标题（###）作为结束
        int end = markdown.indexOf("\n### ", start);
        if (end == -1) {
            end = markdown.indexOf("\n## ", start);
        }
        if (end == -1) {
            end = markdown.length();
        }

        String section = markdown.substring(start, end).trim();

        // 提取实际的提示词内容（去掉代码块标记）
        section = section.replaceAll("^```[\\w]*\\n|\\n```$", "").trim();

        return section;
    }

    /**
     * 获取 P1 视觉标签提取提示词
     */
    public String getP1VisualPrompt() {
        return p1VisualPrompt;
    }

    /**
     * 获取 P_voice 对话洞察提示词
     */
    public String getPVoicePrompt(String dialogueText) {
        if (dialogueText == null || dialogueText.length() < 5) {
            return null;
        }

        // 截断到 500 字
        String truncated = dialogueText.length() > 500
            ? dialogueText.substring(0, 500)
            : dialogueText;

        return pVoicePrompt.replace("{dialogue_text}", truncated);
    }

    /**
     * 获取 P2 融合夸夸提示词
     */
    public String getP2PraisePrompt(JsonNode visualTags, JsonNode voiceInsights, String recentDialogue) {
        String prompt = p2PraisePrompt;

        // 替换视觉标签
        String visualTagsStr = visualTags != null ? visualTags.toString() :
            "{\"blurry\": true, \"expression\": [\"无法辨认\"]}";
        prompt = prompt.replace("{visual_tags}", visualTagsStr);

        // 构建用户画像
        StringBuilder userProfile = new StringBuilder();
        if (voiceInsights != null) {
            userProfile.append(voiceInsights.toString()).append("\n");
        }
        if (recentDialogue != null && !recentDialogue.isEmpty()) {
            userProfile.append("她刚才说: \"").append(recentDialogue).append("\"");
        }

        String profileStr = userProfile.length() > 0 ? userProfile.toString() : "无";
        prompt = prompt.replace("{user_profile}", profileStr);

        return prompt;
    }

    /**
     * 验证夸夸句质量（输出闸门）
     */
    public List<String> validatePraise(String praise) {
        List<String> errors = new ArrayList<>();

        // 清理
        String cleaned = praise
            .replaceAll("[\\[\\]\"「」《》]", "")
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
     * 构建重跑指令
     */
    public String buildRetryInstruction(String failedPraise, List<String> errors) {
        return String.format(
            "\n\n## 重跑指令\n" +
            "上一句「%s」作废，不许复用或改写它。本次必须修正：%s。" +
            "记住：夸是对自己的肯定判断，不是打气口号。只输出一句话。",
            failedPraise,
            String.join("；", errors)
        );
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
}
