# 夸夸镜 · 黑客松演示

浏览器获得摄像头画面后，可生成一条基于画面与可选文字上下文的夸夸并播放语音。服务运行在 `http://127.0.0.1:5680`。

当前实现以提示词测试台对齐为目标：每次点击都运行正式夸夸管线。`/api/precompute` 与 `/api/praise_instant` 仅为兼容端点，预存夸夸模式已停用。

```bash
python -m pip install flask requests
export VECTRUST_API_KEY='...'
python -u -X utf8 app.py
```

打开 `http://127.0.0.1:5680` 并允许摄像头权限。未配置有效凭证时会走本地兜底文案，不能代表模型链路成功。演示会在 `captures/` 保存照片、在 `praise_history.json` 保存历史。安全注意：现有 `config.py` 仍有硬编码回退凭证，须先移除并轮换，才能对外使用。
