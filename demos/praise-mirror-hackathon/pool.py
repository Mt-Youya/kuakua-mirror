# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 预计算池（提速核心）
=========================================
旧版痛点：单槽缓存"取后即焚"，播完要等十几秒重新算，按键落空。
新版：池里常驻最多 5 条"已生成+已配音"的夸夸，补货允许 2 条并发；
  - 消费一条 → 服务端立即自动补货（不等前端催）
  - 画面静止且池满 → 不烧任何调用
  - "再夸一次"按钮优先从池里取；池暂时空会先等在途补货 → 多数按键毫秒级出声
"""
import threading
import time

import config
import store
from pipeline import find_duplicate


def sig_diff(a, b):
    if not a or not b or len(a) != len(b):
        return 1.0
    s = sum(abs(x - y) for x, y in zip(a, b))
    return s / len(a) / 255


class PraisePool:
    def __init__(self):
        self._items = []        # 按生成时间升序
        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)  # 入池时唤醒等待中的点击
        self._inflight = 0      # 在跑的补货任务数（允许少量并发，补货跟得上连点）
        self._last_frame = None  # 最近一次收到的画面，供服务端自动补货

    def set_last_frame(self, frame):
        frame['saved_at'] = time.time()
        self._last_frame = frame

    def get_last_frame(self):
        return self._last_frame

    # ---- 补货闸门：最多同时跑 POOL_MAX_INFLIGHT 条管线，池满则不再补 ----
    def try_begin(self):
        with self._lock:
            if self._inflight >= config.POOL_MAX_INFLIGHT:
                return False
            if len(self._items) >= config.POOL_TARGET:
                return False
            self._inflight += 1
            return True

    def end(self):
        with self._lock:
            self._inflight = max(0, self._inflight - 1)

    # ---- 入池：判重放宽（只拦几乎一模一样），保证池子装得满； ----
    # ---- "和已说过的话不重复"由管线内部严格阈值把关，此处不重复收紧 ----
    def offer(self, item):
        with self._cond:
            if find_duplicate(item['praise'],
                              store.texts() + [i['praise'] for i in self._items],
                              ratio_max=config.POOL_OFFER_RATIO_MAX,
                              bigram_max=config.POOL_OFFER_BIGRAM_JACCARD):
                print(f"[池] 拒收重复句: {item['praise']}")
                return False
            self._items.append(item)
            if len(self._items) > config.POOL_TARGET:
                self._items.pop(0)
            self._cond.notify_all()   # 唤醒正在等货的点击
            return True

    # ---- 取池：要签名相符（画面没大变）且够新鲜；顺便清掉过期项 ----
    def take(self, sig_now):
        now = time.time()
        with self._lock:
            self._items = [i for i in self._items if now - i['ts'] <= config.POOL_MAX_AGE]
            valid = [i for i in self._items
                     if sig_diff(sig_now, i.get('sig')) < config.POOL_SIG_MAX]
            if not valid:
                return None
            item = valid[-1]  # 最新的一条
            self._items = [i for i in self._items if i is not item]
            return item

    # ---- 池暂时空时：等补货成品进池（最多 timeout 秒）----
    # grace 秒内若连补货任务都没启动，就早退让调用方走实时管线，不傻等。
    def wait_take(self, sig_now, timeout=20.0, grace=12.0):
        deadline = time.time() + timeout
        grace_deadline = time.time() + grace
        while True:
            item = self.take(sig_now)
            if item:
                return item
            now = time.time()
            if now >= deadline:
                return None
            with self._lock:
                inflight = self._inflight
            if not inflight and now >= grace_deadline:
                return None
            with self._cond:
                self._cond.wait(min(1.0, max(0.05, deadline - now)))

    def status(self):
        now = time.time()
        with self._lock:
            live = [i for i in self._items if now - i['ts'] <= config.POOL_MAX_AGE]
            freshest_age = round(now - live[-1]['ts'], 1) if live else None
            return {
                'count': len(live),
                'target': config.POOL_TARGET,
                'inflight': self._inflight,
                'freshest_age': freshest_age,
                'person_present': bool(live) and live[-1].get('person_present', False),
                'latest_praise': live[-1]['praise'] if live else '',
            }


pool = PraisePool()
