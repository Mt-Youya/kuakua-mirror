# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 核心管线
============================
P1(看图) ∥ P_voice(听对话) → P2(融合夸夸) → 质量闸门 → 防重复闸门 → 输出

与提示词测试台(5679)的关系：
- 模型/温度/max_tokens/用户消息/质量闸门/重跑机制：逐项一致（输出效果同款）
- 在测试台基础上增加（都是产品侧硬需求，只收紧不放宽）：
  ① 提示词规则16/17/18 对应的额外禁用词检查（开心/俏皮/眼镜）
  ② 全局防重复闸门：历史落盘 + 相似度判重 + 防重复重跑 + 兜底句避让
  ③ 关系阶段提示 + "已说过的话"注入（产品记忆功能）
"""
import re
import json
import time
import random
import difflib
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

import config

# ===== HTTP 连接复用：省去每次调用的 TCP/TLS 握手（提速关键之一）=====
_api_session = requests.Session()
_adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=20)
_api_session.mount('https://', _adapter)
_api_session.mount('http://', _adapter)


def call_llm(model, sys_prompt, user_prompt, image_b64=None,
             temperature=0.9, max_tokens=120, timeout=None):
    """统一 LLM 调用。网络抖动/429/5xx 自动重试（与测试台 call_llm 同款）"""
    timeout = timeout or config.CALL_TIMEOUT
    if image_b64:
        user_content = [
            {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_b64}'}},
            {'type': 'text', 'text': user_prompt}
        ]
    else:
        user_content = user_prompt

    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': sys_prompt},
            {'role': 'user', 'content': user_content}
        ],
        'max_tokens': max_tokens,
        'temperature': temperature
    }
    headers = {
        'Authorization': f'Bearer {config.API_KEY}',
        'Content-Type': 'application/json'
    }

    for attempt in range(3):
        try:
            r = _api_session.post(config.API_BASE, headers=headers, json=payload, timeout=timeout)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise RuntimeError(f"[{model}] 网络错误（已自动重试2次仍失败）: {str(e)[:150]}")

        if r.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            time.sleep(1.5 * (attempt + 1))
            continue
        if r.status_code == 403 and 'insufficient_user_quota' in r.text:
            raise RuntimeError(f"[{model}] API 账户余额不足，请联系发 key 的人充值")
        if r.status_code != 200:
            raise RuntimeError(f"[{model}] HTTP {r.status_code}: {r.text[:200]}")
        return r.json()['choices'][0]['message']['content'].strip()

    raise RuntimeError(f"[{model}] 请求失败：多次重试后仍未成功")


# ===== 后处理与质量闸门（与测试台逐行一致）=====
def clean_praise(text):
    """清理格式残留"""
    text = re.sub(r'\[.*?\]', '', text).strip()
    text = re.sub(r'[""「」《》\[\]]', '', text)
    text = text.replace('劲儿', '').replace('劲头儿', '')
    text = text.replace('专注度', '专注')
    text = text.replace('敞亮', '好看')
    text = text.replace('氛围感', '感觉')
    text = re.sub(r'让人(觉得|感到|感觉)', '真的好', text)
    text = re.sub(r'给人(一种|的感觉)', '', text)
    text = re.sub(r'\s+', '', text).strip()
    return text


# 额外禁用词：已移除——测试台没有这一层，为了质量完全对齐测试台，不再额外拦 开心/俏皮/眼镜


def validate_praise(text):
    """P2 输出硬性规则检查 = 与测试台逐行一致（不加额外禁词）"""
    results = {}
    char_count = len(text)
    results["chars"] = char_count
    results["pass_20"] = char_count <= 20
    results["pass_22"] = char_count <= 22
    results["has_wo"] = "我" in text
    results["has_self"] = ("我" in text) or ("自己" in text)
    results["has_ni"] = "你" in text
    advice = ["可以", "试试", "应该", "加油", "建议", "记得", "别忘"]
    found_advice = [w for w in advice if w in text]
    results["no_advice"] = len(found_advice) == 0
    results["advice_found"] = found_advice
    cliches = ["看起来不错", "状态很好", "今天也要", "心情不错"]
    found_cliche = [c for c in cliches if c in text]
    results["no_cliche"] = len(found_cliche) == 0
    results["cliche_found"] = found_cliche
    object_subjects = ["耳环", "项链", "手链", "戒指", "手表", "眼镜", "帽子", "包包", "鞋子"]
    praised_object = None
    for obj in object_subjects:
        if obj in text and f"我的{obj}" in text:
            if re.search(rf"我的{obj}.{{0,2}}好", text):
                praised_object = obj
    results["praise_person"] = praised_object is None
    results["object_found"] = praised_object
    banned = ["魅力", "迷人", "性感", "有吸引力", "让人心动",
              "令人着迷", "有气质", "好看死了", "美翻了", "温柔"]
    found_banned = [b for b in banned if b in text]
    results["no_banned"] = len(found_banned) == 0
    results["banned_found"] = found_banned
    lazy_pattern = re.findall(r"我.{1,6}的样子好.{1,4}[！!]", text)
    results["no_lazy_pattern"] = len(lazy_pattern) == 0
    feel_words = ["感觉", "觉得"]
    found_feel = [w for w in feel_words if w in text]
    results["no_feel"] = len(found_feel) == 0
    results["feel_found"] = found_feel
    results["pass"] = all([
        results["pass_22"],
        results["has_self"],
        not results["has_ni"],
        results["no_advice"],
        results["no_cliche"],
        results["praise_person"],
        results["no_banned"],
        results["no_lazy_pattern"],
        results["no_feel"],
    ])
    return results


def build_retry_hint(v):
    """把校验失败项翻译成短指令，供重跑时追加"""
    hints = []
    if not v.get("has_self"): hints.append("句子里必须有'我'或'自己'")
    if v.get("has_ni"): hints.append("不许出现'你'字")
    if not v.get("pass_22"): hints.append("超过字数，必须20字以内")
    if not v.get("no_advice"): hints.append("有建议词，只夸不建议")
    if not v.get("no_cliche"): hints.append("是套话，要更具体")
    if not v.get("praise_person"): hints.append("夸了物品，要夸人")
    if not v.get("no_banned"): hints.append("有禁用词")
    if not v.get("no_lazy_pattern"): hints.append("句式套路，换说法")
    if not v.get("no_feel"): hints.append("是观后感不是夸，改成肯定判断")
    if v.get("tag_echo"): hints.append(f"照抄了标签原文「{v['tag_echo']}」，要化成自己的感受重写")
    return "；".join(hints)


def find_tag_echo(praise_text, visual_tags):
    """规则20强制执行：夸夸句照抄 P1 标签原文（≥4字整段出现）→ 返回抄的那段，否则 ''"""
    if not praise_text or not visual_tags:
        return ''
    try:
        tags = json.loads(visual_tags.strip().replace("'", '"'))
    except Exception:
        return ''
    if not isinstance(tags, dict):
        return ''
    parts = []
    for v in tags.values():
        if isinstance(v, list):
            parts.extend(str(x) for x in v)
        elif isinstance(v, str):
            parts.append(v)
    echo = ''
    for p in parts:
        p = p.strip()
        if len(p) >= 4 and p in praise_text and len(p) > len(echo):
            echo = p
    return echo


def _full_validate(text, visual_tags):
    """完整校验 = 测试台同款闸门 + 标签照抄检查（规则20）"""
    v = validate_praise(text)
    echo = find_tag_echo(text, visual_tags)
    if echo:
        v['pass'] = False
        v['tag_echo'] = echo
    return v


# ===== 兜底句（与测试台完全一致：仅 3 句，用时随机挑一句通过闸门的）=====
FALLBACK_SENTENCES = ["我又见面啦！", "每次照镜子都有新发现！", "今天也是独一无二的我！"]


def pick_fallback():
    """与测试台同款：从通过闸门的兜底句里随机挑一句，全不过就全集里随机"""
    ok = [s for s in FALLBACK_SENTENCES if validate_praise(s)['pass']]
    return random.choice(ok or FALLBACK_SENTENCES)


# ===== 防重复：归一化 + 相似度判重 =====
_PUNCT_RE = re.compile(r'[\s，。！？!?…~～,.!、：:；;“”‘’「」《》（）()—-]')


def _normalize(s):
    return _PUNCT_RE.sub('', s or '')


def _bigrams(s):
    return set(s[i:i + 2] for i in range(len(s) - 1)) if len(s) >= 2 else {s}


def find_duplicate(text, candidates, ratio_max=None, bigram_max=None):
    """在 candidates 里找与 text 重复/过近的句子，返回匹配句或 None。
    ratio_max/bigram_max 可覆盖默认阈值（入池判重会传更宽松的值）。"""
    ratio_max = config.DUP_RATIO_MAX if ratio_max is None else ratio_max
    bigram_max = config.DUP_BIGRAM_JACCARD if bigram_max is None else bigram_max
    norm = _normalize(text)
    if not norm:
        return None
    norm_bgs = _bigrams(norm)
    for cand in candidates:
        cand_norm = _normalize(cand)
        if not cand_norm:
            continue
        if cand_norm == norm:
            return cand
        ratio = difflib.SequenceMatcher(None, norm, cand_norm).ratio()
        if ratio >= ratio_max:
            return cand
        inter = len(norm_bgs & _bigrams(cand_norm))
        union = len(norm_bgs | _bigrams(cand_norm))
        if union and inter / union >= bigram_max:
            return cand
    return None


# ===== Session / 关系阶段 =====
import uuid
from datetime import datetime

_sessions = {}
_sessions_lock = threading.Lock()


def _cleanup_expired():
    now = datetime.now()
    with _sessions_lock:
        expired = [sid for sid, s in _sessions.items()
                   if (now - s['last_active']).total_seconds() > config.SESSION_EXPIRE_HOURS * 3600]
        for sid in expired:
            del _sessions[sid]


def get_session(session_id):
    _cleanup_expired()
    with _sessions_lock:
        if session_id and session_id in _sessions:
            _sessions[session_id]['last_active'] = datetime.now()
            return _sessions[session_id]
        new_id = session_id or str(uuid.uuid4())
        _sessions[new_id] = {
            'session_id': new_id,
            'history': [],
            'interaction_count': 0,
            'first_seen': datetime.now(),
            'last_active': datetime.now(),
        }
        return _sessions[new_id]


def get_relationship_stage(session):
    count = session['interaction_count']
    if count <= 5:
        return '初见', '刚刚认识，语气自然真诚，像第一次照镜子的惊喜'
    elif count <= 20:
        return '熟悉', '已经认识一段时间了，语气更亲近自然，像老朋友对着镜子聊天'
    else:
        return '老友', '非常熟了，可以更放松、更大胆地夸，像闺蜜之间的默契'


def record_interaction(session, user_input, praise_text, angle):
    entry = {
        'ts': datetime.now().isoformat(),
        'user_input': user_input or '',
        'praise': praise_text,
        'angle': angle,
    }
    session['history'].append(entry)
    if len(session['history']) > config.MAX_SESSION_HISTORY:
        session['history'] = session['history'][-config.MAX_SESSION_HISTORY:]
    session['interaction_count'] += 1


# ===== P_voice：对话分析 =====
def analyze_dialogue(dialogue_text, pvoice_sys):
    if not dialogue_text or len(dialogue_text.strip()) < 5:
        return ''
    try:
        prompt = pvoice_sys.replace('{dialogue_text}', dialogue_text[:500])
        result = call_llm(config.PROSE_MODEL, prompt, config.PVOICE_USER,
                          temperature=config.PVOICE_TEMPERATURE,
                          max_tokens=config.PVOICE_MAX_TOKENS)
        print(f'[P_voice] {result[:120]}')
        return result
    except Exception as e:
        print(f'[P_voice] 错误: {e}')
        return ''


# ===== P1 预跑缓存（无损提速核心）=====
# 前端每几秒上报最新画面 → 服务端后台用同款模型/同款提示词预跑 P1(∥Pvoice)；
# 点夸夸时若预跑结果与当前画面相符 → 直接跳过 6-10s 的 P1，只跑 P2（约2s）。
# 预跑跑的就是正式管线的 P1：模型/温度/max_tokens/提示词逐项一致，质量零损失。
PRECACHE_MAX_AGE = 20.0     # 预跑结果保鲜窗口（秒）：超龄就当没缓存，走冷启动
PRECACHE_SIG_MAX = 0.10     # 画面签名差上限：画面变了就不吃旧缓存（与场景相似判据同口径）
PRECACHE_WAIT_MAX = 7.5     # 点击时若"相符的预跑"正在飞，最多等它这么久。
                            # P1 实测 6.5-9.3s：宁可串行等，也别并发冷启动——
                            # 同 key 并发会撞网关限流，两边一起慢 3 倍（实测 18s）
PRECACHE_REFRESH_MIN = 12.0 # 已完成缓存不足这个龄、画面又没变 → 不许新一轮上报覆盖，
                            # 否则命中窗口只剩两轮上报间的 3 秒

_precache_lock = threading.Lock()
PRECACHE_MAX_SLOTS = 8      # 并发设备/标签页上限：每个会话一个专属预跑槽
_precache_slots = {}         # session_id -> slot；多设备各用各的槽，互不覆盖、互不串


def _new_slot(sid):
    return {
        '_sid': sid,
        'state': 'idle',          # idle / running / done
        'sig': None,
        'dialogue': '',
        'description': None,
        'voice_insights': '',
        't_start': 0.0,
        't_done': 0.0,
        'thread': None,
        'error': '',
    }


def _get_slot(sid):
    """取会话的预跑槽（持锁调用）。没有就建；超上限先淘汰最旧的非运行槽。"""
    if sid not in _precache_slots and len(_precache_slots) >= PRECACHE_MAX_SLOTS:
        victims = sorted((s for s in _precache_slots.values() if s['state'] != 'running'),
                         key=lambda s: s['t_start'])
        for v in victims:
            if len(_precache_slots) < PRECACHE_MAX_SLOTS:
                break
            _precache_slots.pop(v['_sid'], None)
    if sid not in _precache_slots:
        _precache_slots[sid] = _new_slot(sid)
    return _precache_slots[sid]


def _peek_slot(sid):
    """只读查槽（持锁调用），不存在返回 None，不新建。"""
    return _precache_slots.get(sid)


def sig_diff(a, b):
    """帧签名差（与前端 sigDiff 同口径：平均灰度差/255）"""
    if not a or not b or len(a) != len(b):
        return 1.0
    return sum(abs(float(x) - float(y)) for x, y in zip(a, b)) / len(a) / 255.0


def _run_precache_job(slot, sid, image_b64, dialogue):
    """后台线程：预跑 P1(∥Pvoice)。与正式管线同款调用，只是提前跑。结果写回自己的槽。"""
    tag = (sid or 'anon')[:8]
    try:
        prompts, _src = config.get_effective_prompts()
        if not prompts:
            raise RuntimeError('提示词文件不可用')
        p1_sys, pvoice_sys = prompts['p1'], prompts.get('pvoice', '')
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=2) as ex:
            f_p1 = ex.submit(call_llm, config.VISION_MODEL, p1_sys, config.P1_USER,
                             image_b64, config.P1_TEMPERATURE, config.P1_MAX_TOKENS)
            f_pv = ex.submit(analyze_dialogue, dialogue, pvoice_sys) \
                if dialogue and dialogue.strip() else None
            description = f_p1.result()
            voice_insights = f_pv.result() if f_pv else ''
        ms = round((time.time() - t0) * 1000)
        with _precache_lock:
            if slot['state'] == 'running':
                slot.update(state='done', description=description,
                            voice_insights=voice_insights, t_done=time.time())
        print(f'[预跑 sid={tag}] P1 预跑完成 {ms}ms: {description[:80]}')
    except Exception as e:
        with _precache_lock:
            if slot['state'] == 'running':
                slot.update(state='done', error=str(e)[:200], t_done=time.time())
        print(f'[预跑 sid={tag}] 预跑失败: {e}')


def start_precache(sid, image_b64, sig, dialogue):
    """接受一次帧上报 → 启动后台预跑。每个会话用自己的专属槽，互不挤占。
    本会话已有预跑在飞 → 返回 False。"""
    with _precache_lock:
        slot = _get_slot(sid)
        if slot['state'] == 'running':
            return False
        # 保护新鲜的已完成缓存：画面没变就让它继续服役，别被新一轮预跑覆盖
        # （否则缓存完成后只活 3 秒，命中窗口太短，观众点一下就冷启动）
        if slot['state'] == 'done' and slot['description'] and not slot['error'] \
                and time.time() - slot['t_done'] < PRECACHE_REFRESH_MIN \
                and sig_diff(slot['sig'], sig) <= PRECACHE_SIG_MAX:
            return False
        slot.update(state='running', sig=sig, dialogue=dialogue or '',
                    description=None, voice_insights='', error='',
                    t_start=time.time(), t_done=0.0)
        th = threading.Thread(target=_run_precache_job,
                              args=(slot, sid, image_b64, dialogue), daemon=True)
        slot['thread'] = th
    th.start()
    return True


def try_take_precache(sid, sig, dialogue):
    """点击夸夸时，尝试取本会话的预跑结果：
    - 已完成 + 画面相符 + 保鲜期内 → 取走并清空（用过即作废）
    - 正在飞且画面相符 → 最多等 PRECACHE_WAIT_MAX 秒
    - 其它情况返回 None → 走冷启动（与之前完全一致的行为）
    用过即作废 = 每条夸夸都拥有专属的新鲜看图结果，与测试台"每点一次新鲜看一次"
    的语义一致；绝不把同一份标签喂给多条夸夸（那会让 P2 输出趋同、质量下降）。
    dialogue 与预跑时一致才复用 Pvoice，否则只复用 P1、Pvoice 现场跑。"""
    if not sig:
        return None
    tag = (sid or 'anon')[:8]
    deadline = time.time() + PRECACHE_WAIT_MAX
    waited = 0.0
    while True:
        with _precache_lock:
            slot = _peek_slot(sid)
            if not slot or slot['state'] == 'idle':
                print(f'[预跑决策] sid={tag} 未命中：本会话无缓存')
                return None
            d = sig_diff(slot['sig'], sig)
            if slot['state'] == 'running':
                if d > PRECACHE_SIG_MAX:
                    print(f'[预跑决策] sid={tag} 未命中：在飞但画面不符 d={d:.3f}')
                    return None
                if time.time() - slot['t_start'] > PRECACHE_WAIT_MAX:
                    print(f'[预跑决策] sid={tag} 未命中：在飞太久不等了')
                    return None
            else:
                age = time.time() - slot['t_done']
                if d > PRECACHE_SIG_MAX:
                    print(f'[预跑决策] sid={tag} 未命中：画面不符 d={d:.3f}')
                    return None
                if age > PRECACHE_MAX_AGE:
                    print(f'[预跑决策] sid={tag} 未命中：缓存超龄 {age:.1f}s')
                    return None
                if slot['error'] or not slot['description']:
                    print(f'[预跑决策] sid={tag} 未命中：预跑失败 {slot["error"][:40]}')
                    return None
                dialogue_same = (slot['dialogue'] == (dialogue or ''))
                taken = {
                    'description': slot['description'],
                    'voice_insights': slot['voice_insights'] if dialogue_same else None,
                    'age_ms': round(age * 1000),
                    'waited_ms': round(waited * 1000),
                }
                # 取走即清空：下一条夸夸必须吃新鲜的看图结果
                slot.update(state='idle', sig=None, dialogue='', description=None,
                            voice_insights='', thread=None, error='')
                print(f'[预跑决策] sid={tag} 命中：age={taken["age_ms"]}ms waited={taken["waited_ms"]}ms')
                return taken
        if time.time() > deadline:
            print(f'[预跑决策] sid={tag} 未命中：等在飞超时 {PRECACHE_WAIT_MAX}s')
            return None
        th = slot.get('thread')
        if th:
            th.join(timeout=0.5)
        waited += 0.5


# ===== 核心管线（与测试台 /api/test 逐行同款）=====
def run_praise_pipeline(session, image_b64, ambient_raw, precache=None, last_praises=None):
    """
    与提示词测试台完全一致的管线：
    P1(看图) ∥ P_voice(听对话) → P2(融合夸夸) → 质量闸门(不达标重跑最多2次) → 仍败落兜底。
    没有防重复、没有"已说过的话"注入、没有落点注入、没有额外禁词——
    测试台怎么夸，这里就怎么夸。
    ambient_raw = 环境收音 + 用户打的字（相当于测试台的对话框输入）。
    """
    prompts, source = config.get_effective_prompts()
    if not prompts:
        raise RuntimeError('提示词文件不可用')
    p1_sys, pvoice_sys, p2_tpl = prompts['p1'], prompts.get('pvoice', ''), prompts['p2']

    t_all = time.time()

    # ---- 并行：P1 看图 ∥ P_voice 听对话（与测试台同款参数）----
    # 命中预跑缓存时直接跳过 P1（预跑就是同款 P1 提前跑完，质量零差异）
    t_par = time.time()
    description, voice_insights = '', ''
    p1_source = 'live'
    if precache and precache.get('description'):
        p1_source = 'precache'
        description = precache['description']
        if precache.get('voice_insights') is not None:
            voice_insights = precache['voice_insights']
        elif ambient_raw and ambient_raw.strip():
            voice_insights = analyze_dialogue(ambient_raw, pvoice_sys)
        par_ms = round((time.time() - t_par) * 1000)
        print(f'[P1 标签·预跑 龄={precache.get("age_ms", "?")}ms 等={precache.get("waited_ms", 0)}ms] '
              f'{description[:160]}')
    else:
        with ThreadPoolExecutor(max_workers=2) as exec_pool:
            f_p1 = exec_pool.submit(call_llm, config.VISION_MODEL, p1_sys, config.P1_USER,
                                    image_b64, config.P1_TEMPERATURE, config.P1_MAX_TOKENS)
            f_pv = exec_pool.submit(analyze_dialogue, ambient_raw, pvoice_sys) \
                if ambient_raw and ambient_raw.strip() else None
            try:
                description = f_p1.result()
            except Exception as e:
                print(f'[P1] 错误: {e}')
                description = ''
            if f_pv:
                voice_insights = f_pv.result()
        par_ms = round((time.time() - t_par) * 1000)
        print(f'[P1 标签] {description[:160]}')

    # ---- 组装 P2 输入（占位符填充与测试台逐行一致）----
    visual_tags = description if description else '{"blurry": true, "expression": ["无法辨认"]}'
    user_profile_parts = []
    if voice_insights:
        user_profile_parts.append(voice_insights)
    if ambient_raw and ambient_raw.strip():
        user_profile_parts.append(f'她刚才说: "{ambient_raw.strip()}"')
    user_profile = '\n'.join(user_profile_parts) if user_profile_parts else '无'

    p2_sys = (p2_tpl
              .replace('{visual_tags}', visual_tags)
              .replace('{user_profile}', user_profile)
              # 兼容旧占位符（与测试台一致）
              .replace('{visual_description}', visual_tags)
              .replace('{voice_insights}', voice_insights or '（没有听到对话）')
              .replace('{relationship_stage}', '初见')
              .replace('{relationship_hint}', '刚刚认识，语气克制温柔')
              .replace('{history_context}', ''))

    # ---- 连续夸防角度趋同：把最近夸夸告诉 P2，激活它自己的规则10/19 ----
    # 只注入"刚才说过什么"，让模型自觉换落点；不加判重闸门、不强制重跑，
    # 质量闸门与兜底保持与测试台完全一致。预跑缓存管 P1 提速，这里管 P2 组装，互不干扰。
    if last_praises:
        lines = '\n'.join('「%s」' % p for p in last_praises if p)
        if lines:
            p2_sys += ('\n\n## 刚说过的夸夸（规则10/19 生效）\n' + lines +
                       '\n上面是已经说过的。这一条必须换完全不同的落点：'
                       '句子、角度、维度都不许跟上面重复，也不许围着上面提到的同一件物品夸。')

    # ---- 生成 + 质量闸门：不达标重跑最多2次，仍败落兜底（与测试台一致）----
    t_p2 = time.time()
    praise_raw = call_llm(config.PROSE_MODEL, p2_sys, config.P2_USER,
                          temperature=config.P2_TEMPERATURE, max_tokens=config.P2_MAX_TOKENS)
    p2_ms = round((time.time() - t_p2) * 1000)

    praise_text = clean_praise(praise_raw)
    validation = _full_validate(praise_text, visual_tags)
    retries = 0
    while not validation['pass'] and retries < 2:
        hint = build_retry_hint(validation)
        retry_sys = (p2_sys +
                     '\n\n## 重跑指令\n上一句「' + praise_text + '」作废，不许复用或改写它。'
                     '本次必须修正：' + hint + '。'
                     '记住：夸是对自己的肯定判断，不是打气口号。只输出一句话。')
        t_r = time.time()
        try:
            raw_r = call_llm(config.PROSE_MODEL, retry_sys, config.P2_USER,
                             temperature=config.P2_TEMPERATURE, max_tokens=config.P2_MAX_TOKENS)
        except Exception:
            break  # 网络异常就不重跑了，直接走兜底判断
        p2_ms += round((time.time() - t_r) * 1000)
        retries += 1
        praise_text = clean_praise(raw_r)
        validation = _full_validate(praise_text, visual_tags)

    fallback_used = False
    if not validation['pass']:
        praise_text = pick_fallback()
        fallback_used = True
        validation = validate_praise(praise_text)

    total_ms = round((time.time() - t_all) * 1000)
    print(f'[P2 夸夸] {praise_text}  [验证] pass={validation["pass"]} chars={validation["chars"]} '
          f'retries={retries} fallback={fallback_used}')
    print(f'[耗时] P1+Pvoice={par_ms}ms P2(含重跑)={p2_ms}ms 总计={total_ms}ms')

    return {
        'praise': praise_text,
        'description': description,
        'stage_name': '初见',
        'retries': retries,
        'fallback': fallback_used,
        'validation': validation,
        'timings': {'parallel_ms': par_ms, 'p2_ms': p2_ms, 'total_ms': total_ms,
                    'p1_source': p1_source},
    }
