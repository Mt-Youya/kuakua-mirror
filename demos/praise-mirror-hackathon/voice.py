# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 语音通路（STT 转写 + TTS 合成）
====================================================
沿用 8-29 已验证的 openai-next 代理配置：
- STT: gpt-4o-mini-transcribe（抗噪、静音原生返回空）
- TTS: qwen3-tts-flash（女声 Cherry / 男声 Ethan）
含防幻觉过滤、防卡带截断、外语幻觉丢弃（都是实战踩坑后的修复）。
"""
import os
import re
import json
import time
import base64
import subprocess
import tempfile
from datetime import datetime

import config

STT_LOG = os.path.join(config.SERVER_DIR, 'stt_debug.log')


def _log_stt(line):
    try:
        with open(STT_LOG, 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.now()}] {line}\n")
    except Exception:
        pass


def transcribe_audio(audio_b64, audio_format='webm'):
    """音频 base64 -> 文本。失败返回 ''。"""
    if not config.API_KEY:
        return ''
    audio_path = None
    try:
        ext = audio_format.split(';')[0].split('/')[-1] or 'webm'
        audio_bytes = base64.b64decode(audio_b64)
        with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as af:
            af.write(audio_bytes)
            audio_path = af.name

        for attempt in range(3):
            result = subprocess.run(
                [
                    'curl', '-s', '-w', '\nHTTP_CODE:%{http_code}', '-X', 'POST',
                    config.STT_API_URL,
                    '-H', f'Authorization: Bearer {config.API_KEY}',
                    '-F', f'model={config.STT_MODEL}',
                    '-F', 'language=zh',
                    '-F', 'temperature=0',
                    '-F', f'file=@{audio_path}',
                    '--connect-timeout', '5',
                    '--max-time', '25'
                ],
                capture_output=True, timeout=30
            )
            # 不用 text=True：Windows GBK 解 UTF-8 中文会炸
            stdout = result.stdout.decode('utf-8', errors='replace')
            if result.returncode == 0 and 'HTTP_CODE:200' in stdout:
                body = stdout.rsplit('\nHTTP_CODE:', 1)[0].strip()
                if body:
                    resp_json = json.loads(body)
                    resp_text = (resp_json.get('text') or '').strip()
                    resp_text = _filter_hallucination(resp_text)
                    _log_stt(f"whisper OK: text='{resp_text[:80]}'")
                    return resp_text
            _log_stt(f"curl attempt {attempt+1}: exit={result.returncode}, "
                     f"stdout='{stdout[:200]}', stderr='{result.stderr.decode('utf-8', errors='replace')[:150]}'")
            time.sleep(1)
        return ''
    except Exception as e:
        _log_stt(f"[STT] 错误: {e}")
        return ''
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except Exception:
                pass


def _filter_hallucination(text):
    """静音段幻觉过滤 + 防卡带截断 + 外语幻觉丢弃"""
    low = text.lower().strip('。.!！?？ ')
    halluc_keywords = ('字幕', '翻译', '校对', '听译', 'amara', 'subtitl', 'volunteer',
                       '点赞', '订阅', '转发', '打赏', '栏目', 'subscribe')
    if low in {'谢谢', '謝謝', '谢谢观看', '谢谢收看', 'thank you', 'thanks for watching'} \
            or any(k in low for k in halluc_keywords):
        return ''
    # 防卡带：短短语连续重复 5 次以上 → 从重复处截断保留前半
    m = re.search(r'(.{2,12}?)\1{4,}', text)
    if m:
        cut = text[:m.start()].strip('，,。.!！?？ ')
        _log_stt(f"防卡带截断: 原{len(text)}字 -> {len(cut)}字")
        text = cut
    # 外语幻觉丢弃
    if any('\u0400' <= ch <= '\u04ff' or '\u3040' <= ch <= '\u30ff'
           or '\uac00' <= ch <= '\ud7af' for ch in text):
        _log_stt(f"外语幻觉丢弃: '{text[:40]}'")
        return ''
    return text


def synthesize_speech(text, voice=None):
    """文本 -> mp3 音频字节。失败返回 None。"""
    if not config.API_KEY or not text:
        return None
    if voice not in config.TTS_VOICE_WHITELIST:
        voice = config.TTS_VOICE
    try:
        payload = json.dumps({
            'model': config.TTS_MODEL,
            'input': text,
            'voice': voice,
        }, ensure_ascii=False)

        result = None
        for attempt in range(3):
            result = subprocess.run(
                [
                    'curl', '-s', '-X', 'POST',
                    config.TTS_API_URL,
                    '-H', f'Authorization: Bearer {config.API_KEY}',
                    '-H', 'Content-Type: application/json',
                    '-d', payload,
                    '--connect-timeout', '5',
                    '--max-time', '30'
                ],
                capture_output=True, timeout=40
            )
            if result.returncode == 0 and result.stdout and not result.stdout.lstrip()[:1] == b'{':
                break
            time.sleep(1)

        if not result or not result.stdout or result.stdout.lstrip()[:1] == b'{':
            return None
        return result.stdout
    except Exception:
        return None
