# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 配置中心
============================
所有 API / 模型 / 端口 / 管线参数集中在这里。
管线参数与「提示词测试台」(5679) 完全一致，保证两边输出效果同款。
"""
import os
import json
import threading

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))

# ===== 版本 =====
VERSION = 'hackathon-1.1.0-对齐测试台'
PORT = 5680

# ===== LLM API（openai-next 代理，VECTRUST key）=====
API_KEY = os.environ.get('VECTRUST_API_KEY', 'sk-YHS5vHwarswbWnX9E9B19bB4E32e40CfAd4b9d62C692E0A6')
API_BASE = 'https://api.openai-next.com/v1/chat/completions'
VISION_MODEL = 'qwen-vl-max'   # P1: 看图提标签
PROSE_MODEL = 'qwen-max'       # P_voice / P2

# ===== 语音 =====
STT_API_URL = 'https://api.openai-next.com/v1/audio/transcriptions'
STT_MODEL = 'gpt-4o-mini-transcribe'   # 抗噪、静音原生返回空
TTS_API_URL = 'https://api.openai-next.com/v1/audio/speech'
TTS_MODEL = 'qwen3-tts-flash'
TTS_VOICE = 'Cherry'                   # 默认女声·芊悦
TTS_VOICE_WHITELIST = {'Cherry', 'Ethan'}

# ===== 管线参数（与测试台逐一对齐，勿单独改）=====
P1_USER = '提取标签'
P1_TEMPERATURE, P1_MAX_TOKENS = 0.7, 300
PVOICE_USER = '分析对话'
PVOICE_TEMPERATURE, PVOICE_MAX_TOKENS = 0.5, 300
P2_USER = '夸一句'
P2_TEMPERATURE, P2_MAX_TOKENS = 0.95, 40
MAX_RETRIES = 2          # 质量重跑次数：与测试台一致（只保质量，不再有防重复重跑）
CALL_TIMEOUT = 30        # 单次 LLM 调用超时（秒）

# ===== 预计算池（提速核心）=====
POOL_TARGET = 5          # 池里常驻几条"已做好+已配音"的夸夸（连点不空手）
POOL_MAX_INFLIGHT = 1    # 补货保持串行：实测API网关按key限流，并发2条时每次调用慢3倍（TTS 3.2s→9.3s），串行反而更快
POOL_MAX_AGE = 600.0     # 备货保鲜 10 分钟（画面是否相符另有签名闸门把关，过期只为防陈年旧货）
POOL_SIG_MAX = 0.15      # 取缓存时画面签名差上限（画面大变就不吃旧缓存）
PRECOMPUTE_DEDUP_INJECT = 30   # 注入 P2 的"已说过"句子上限（10→30：注入太少时 P2 看不见自己刚说过的话，反复撞车重跑3次甚至落兜底，又慢又水）
DEDUP_HISTORY_WINDOW = 200     # 判重只比对最近 200 条历史（历史越积越多时，全量比对越来越慢且误伤；200条足够保证一天不重样）
ANGLES_REFRESH_EVERY = 8       # 每新增 8 条夸夸，后台重新归纳一次"已夸过的落点"清单（注入P2，主动换角度防同义重复）

# ===== 防重复相似度阈值 =====
DUP_RATIO_MAX = 0.60     # 序列相似度 >= 此值判为重复（对"已说过的话"，严格）
DUP_BIGRAM_JACCARD = 0.50  # 二字词重叠度 >= 此值判为重复（对"已说过的话"，严格）
# 入池判重放宽：同一画面下模型易产出同构句，若入池也按0.6拦，池子会长期装不满→连点落空。
# 入池只拦"几乎一模一样"(0.85/0.75)，保证池子装得满；"和已说过的不重复"仍由管线内部严格把关。
POOL_OFFER_RATIO_MAX = 0.85
POOL_OFFER_BIGRAM_JACCARD = 0.75

# ===== Session =====
SESSION_EXPIRE_HOURS = 24
MAX_SESSION_HISTORY = 20
HISTORY_FILE_CAP = 500   # 全局历史落盘最多保留条数


# ===== 提示词热加载 =====
# 来源①：测试台「同步到demo」写入的那份 = 单一事实源（保证与测试台同款）
# 来源②：本目录快照（来源①不存在时的兜底）
PROMPT_SOURCES = [
    r'C:\Users\guyu\.qoderwork\workspace\mrujhdhu6kvkx92r\outputs\praise-mirror-demo\prompts_live.json',
    os.path.join(SERVER_DIR, 'prompts_live.json'),
]

_prompts_cache = {'key': None, 'data': None, 'source': None}
_prompts_lock = threading.Lock()


def get_effective_prompts():
    """返回 (prompts_dict, source_path)。文件一改动，下次调用自动重读，免重启。"""
    with _prompts_lock:
        for path in PROMPT_SOURCES:
            try:
                if not os.path.exists(path):
                    continue
                mtime = os.path.getmtime(path)
                key = (path, mtime)
                if _prompts_cache['key'] == key:
                    return _prompts_cache['data'], _prompts_cache['source']
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get('p1') and data.get('p2'):
                    _prompts_cache['key'] = key
                    _prompts_cache['data'] = data
                    _prompts_cache['source'] = path
                    print(f"[prompts] 已加载 {path}（p1={len(data['p1'])}字 p2={len(data.get('p2',''))}字）")
                    return data, path
            except Exception as e:
                print(f"[prompts] 读取失败 {path}: {e}")
        print('[prompts] 所有来源都不可用！请检查提示词文件')
        return None, None
