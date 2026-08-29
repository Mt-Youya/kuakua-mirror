# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 全局夸夸历史（防重复的事实源）
==================================================
每一条真正"说出口"的夸夸都落盘到 praise_history.json。
重启服务、重开浏览器都不会丢 —— 黑客松一整天不重复任何一句。
"""
import os
import json
import threading
import time

import config

HISTORY_PATH = os.path.join(config.SERVER_DIR, 'praise_history.json')

_lock = threading.Lock()
_history = []  # [{ts, text, mode}]


def load():
    global _history
    try:
        if os.path.exists(HISTORY_PATH):
            with open(HISTORY_PATH, 'r', encoding='utf-8') as f:
                _history = json.load(f)
            print(f'[历史] 已载入 {len(_history)} 条夸夸记录')
    except Exception as e:
        print(f'[历史] 载入失败，从空历史开始: {e}')
        _history = []


def _save_locked():
    try:
        tmp = HISTORY_PATH + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(_history[-config.HISTORY_FILE_CAP:], f, ensure_ascii=False, indent=1)
        os.replace(tmp, HISTORY_PATH)
    except Exception as e:
        print(f'[历史] 落盘失败: {e}')


def add(text, mode='live'):
    """记录一条已播出的夸夸。调用方必须确保该句已通过防重复闸门。"""
    with _lock:
        _history.append({'ts': time.time(), 'text': text, 'mode': mode})
        if len(_history) > config.HISTORY_FILE_CAP:
            del _history[:len(_history) - config.HISTORY_FILE_CAP]
        _save_locked()


def texts():
    """判重用的历史文本（只看最近 DEDUP_HISTORY_WINDOW 条，防止历史越积越慢）"""
    with _lock:
        return [h['text'] for h in _history[-config.DEDUP_HISTORY_WINDOW:]]


def recent_texts(n=None):
    """最近 n 条（注入 P2 用）"""
    n = n or config.PRECOMPUTE_DEDUP_INJECT
    with _lock:
        return [h['text'] for h in _history[-n:]]


def count():
    with _lock:
        return len(_history)
