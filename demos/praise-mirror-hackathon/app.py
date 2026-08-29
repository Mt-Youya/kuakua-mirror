# -*- coding: utf-8 -*-
"""
夸夸镜·黑客松版 —— 主服务 (端口 5680)
=======================================
架构（已完全对齐提示词测试台，质量优先）：
  config    配置中心（API/模型/管线参数/提示词热加载）
  pipeline  P1∥P_voice→P2 管线 + 质量闸门（与测试台逐行一致）
  voice     STT 转写 + TTS 合成
  store     夸夸记录（仅存档展示用，不参与生成）
  app       本文件：Flask 路由

已废弃：预计算池/自动补货/防重复注入——这些机制曾把 P2 逼进重复句式和兜底。
现在每次夸夸都现场跑完整管线：测试台怎么夸，镜子就怎么夸。

运行：python -u -X utf8 app.py  →  http://localhost:5680
"""
import os
import base64
import time
import threading
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory, Response

import config
import store
import voice
import pipeline
from pipeline import (get_session, record_interaction, get_relationship_stage,
                      run_praise_pipeline, pick_fallback)

app = Flask(__name__, static_folder='.', static_url_path='')
CAPTURE_DIR = os.path.join(config.SERVER_DIR, 'captures')

# 正在跑的实时夸夸数量：预跑要避开它（网关按 key 限流，撞车会把观众正等着的夸夸拖慢）
_state_lock = threading.Lock()
_state = {'praise_active': 0}


def _no_cache(resp):
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp


def save_capture(image_b64):
    """照片存档，方便回溯"这条夸夸来自哪张照片"；失败不影响主流程"""
    try:
        os.makedirs(CAPTURE_DIR, exist_ok=True)
        name = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3] + '.jpg'
        with open(os.path.join(CAPTURE_DIR, name), 'wb') as f:
            f.write(base64.b64decode(image_b64))
        return name
    except Exception as e:
        print(f'[Capture] 存档失败（不影响夸夸）: {e}')
        return ''


def _person_present(description):
    """P1 标签为空/无法辨认/模糊 → 没人。自动夸夸只在有人时触发"""
    desc = (description or '').strip()
    desc_norm = desc.replace("'", '"')
    return bool(desc) and '无法辨认' not in desc \
        and '"blurry": true' not in desc_norm and '"blurry":true' not in desc_norm


def _deliver(session, praise_text, user_input, angle, mode):
    """统一的"说出口"动作：记 session + 落盘全局历史（防重复事实源）"""
    record_interaction(session, user_input, praise_text, angle)
    store.add(praise_text, mode)


# ================= 路由 =================
@app.route('/')
def index():
    return _no_cache(send_from_directory('.', 'index.html'))


@app.route('/index.html')
def index_html():
    return _no_cache(send_from_directory('.', 'index.html'))


@app.route('/api/health')
def health():
    prompts, source = config.get_effective_prompts()
    return jsonify({
        'ok': True,
        'version': config.VERSION,
        'mode': 'testbench-aligned',
        'prompts_source': source,
        'prompts_loaded': bool(prompts),
        'history_count': store.count(),
    })


@app.route('/api/praise', methods=['POST'])
def praise():
    """
    唯一夸夸链路（已完全对齐测试台）：
    每次按键都现场跑完整管线——不备货、不吃缓存。
    测试台怎么夸，镜子就怎么夸。
    """
    t0 = time.time()
    data = request.json or {}
    image_b64 = data.get('image', '')
    session = get_session(data.get('session_id', ''))
    ambient_raw = (data.get('ambient_context') or '').strip()
    user_input = (data.get('user_input') or '').strip()

    # 用户打了字 → 并入对话上下文（相当于测试台对话框里输入的话）
    dialogue_raw = ambient_raw
    if user_input:
        dialogue_raw = (f'她刚才对镜子说："{user_input}"'
                        + ('\n' + ambient_raw if ambient_raw else ''))
        print(f'[praise] 有输入「{user_input[:30]}」，已并入对话喂给管线')

    if not image_b64:
        return jsonify({'error': '没有收到图片'}), 400
    capture_name = save_capture(image_b64)
    try:
        if not config.API_KEY:
            raise RuntimeError('未配置 API_KEY')
        with _state_lock:
            _state['praise_active'] += 1
        try:
            # 提速：先试本会话的 P1 预跑缓存（同款 P1 提前跑好的；画面不符自动走冷启动）
            prec = pipeline.try_take_precache(session['session_id'], data.get('sig'), dialogue_raw)
            # 最近4条夸夸 → 注入 P2，激活提示词规则10/19，避免隔几句又撞回同一落点
            last_praises = [h['praise'] for h in session['history'][-4:] if h.get('praise')]
            result = run_praise_pipeline(session, image_b64, dialogue_raw, precache=prec,
                                         last_praises=last_praises or None)
        finally:
            with _state_lock:
                _state['praise_active'] -= 1
        _deliver(session, result['praise'], user_input, 'live', 'live')
        return jsonify({
            'praise': result['praise'],
            'capture_file': capture_name,
            'source': 'live',
            'session_id': session['session_id'],
            'interaction_count': session['interaction_count'],
            'relationship_stage': result['stage_name'],
            'retries': result['retries'],
            'fallback': result['fallback'],
            'timings': dict(result['timings'],
                            total_ms=round((time.time() - t0) * 1000),
                            wait_precache_ms=(prec or {}).get('waited_ms', 0)),
        })
    except Exception as e:
        # 兜底：路演绝不能冷场，出错也给一句能说的话
        print(f'[praise] 管线异常，走兜底: {e}')
        fb = pick_fallback()
        _deliver(session, fb, user_input, 'fallback', 'fallback')
        return jsonify({
            'praise': fb,
            'capture_file': capture_name,
            'source': 'fallback',
            'fallback': True,
            'session_id': session['session_id'],
            'interaction_count': session['interaction_count'],
            'relationship_stage': get_relationship_stage(session)[0],
            'timings': {'total_ms': round((time.time() - t0) * 1000)},
        })


@app.route('/api/precompute', methods=['POST'])
def precompute():
    """已停用：对齐测试台后不再预计算（保留端点，旧前端调用不会报错）"""
    return jsonify({'accepted': False, 'disabled': True,
                    'note': '已完全对齐测试台：每次夸夸现场生成，不再备货'})


@app.route('/api/precache', methods=['POST'])
def precache():
    """
    提速端点：前端定期上报最新画面 → 服务端后台预跑 P1(∥Pvoice)。
    预跑的就是正式管线的 P1（同款模型/提示词/参数），质量零差异，只是提前跑。
    点击夸夸时画面相符 → 跳过 6-10s 的 P1，只花 P2 的 ~2s。
    有夸夸正在跑 / 已有预跑在飞 → 返回 busy（防止撞网关限流拖慢观众正等的夸夸）。
    """
    try:
        data = request.json or {}
        image_b64 = data.get('image', '')
        sig = data.get('sig')
        sid = (data.get('session_id') or '').strip() or 'anon'
        if not image_b64:
            return jsonify({'accepted': False}), 400
        if not config.API_KEY:
            return jsonify({'accepted': False, 'error': '未配置 API_KEY'}), 503
        with _state_lock:
            if _state['praise_active'] > 0:
                return jsonify({'accepted': False, 'busy': True,
                                'reason': 'praise_inflight'})
        ambient_raw = (data.get('ambient_context') or '').strip()
        user_input = (data.get('user_input') or '').strip()
        # 与 /api/praise 逐字一致拼装：点击时对话没变才能连 Pvoice 一起复用
        dialogue_raw = ambient_raw
        if user_input:
            dialogue_raw = (f'她刚才对镜子说："{user_input}"'
                            + ('\n' + ambient_raw if ambient_raw else ''))
        started = pipeline.start_precache(sid, image_b64, sig, dialogue_raw)
        return jsonify({'accepted': started, 'busy': not started})
    except Exception as e:
        return jsonify({'accepted': False, 'error': str(e)}), 500


@app.route('/api/praise_instant', methods=['POST'])
def praise_instant():
    """已停用：不再有预存夸夸"""
    return jsonify({'error': '预存模式已停用，请走 /api/praise 实时生成'}), 404


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """音频片段 → 文本（静默收音用）"""
    try:
        data = request.json or {}
        audio_b64 = data.get('audio', '')
        audio_format = data.get('format', 'webm')
        if not audio_b64:
            return jsonify({'error': '没有收到音频'}), 400
        if not config.API_KEY:
            return jsonify({'text': '', 'error': '未配置 API_KEY'}), 503
        text = voice.transcribe_audio(audio_b64, audio_format)
        if text:
            print(f'[STT] 转写({len(text)}字): {text[:80]}')
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tts', methods=['POST'])
def tts():
    """文本 → 语音（池里没音频时的回退）"""
    try:
        data = request.json or {}
        text = (data.get('text') or '').strip()
        v = data.get('voice', '')
        if not text:
            return jsonify({'error': '没有收到文本'}), 400
        audio_bytes = voice.synthesize_speech(text, v or None)
        if audio_bytes:
            return Response(audio_bytes, mimetype='audio/mpeg',
                            headers={'Content-Disposition': 'inline; filename="tts.mp3"'})
        return jsonify({'error': '语音合成失败'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/session', methods=['POST'])
def session_info():
    data = request.json or {}
    session = get_session(data.get('session_id', ''))
    stage_name, _ = get_relationship_stage(session)
    return jsonify({
        'session_id': session['session_id'],
        'interaction_count': session['interaction_count'],
        'relationship_stage': stage_name,
        'history_count': len(session['history']),
        'recent_praises': [h['praise'] for h in session['history'][-5:]],
        'global_history': store.count(),
    })


if __name__ == '__main__':
    store.load()
    print('\n' + '=' * 54)
    print('  夸夸镜·黑客松版  ' + config.VERSION)
    print('  模式：完全对齐测试台（每次现场生成，不备货）')
    print('=' * 54)
    print(f'  浏览器打开: http://localhost:{config.PORT}')
    prompts, source = config.get_effective_prompts()
    print(f'  提示词来源: {source or "!! 不可用，请检查 !!"}')
    print(f'  管线: {config.VISION_MODEL} ∥ {config.PROSE_MODEL} → P2'
          f'（与测试台逐行一致）')
    print('  按 Ctrl+C 停止\n')
    app.run(host='0.0.0.0', port=config.PORT, debug=False, threaded=True)
