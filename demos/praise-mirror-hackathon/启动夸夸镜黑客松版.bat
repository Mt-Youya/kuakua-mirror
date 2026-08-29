@echo off
chcp 65001 >nul
echo.
echo ===================================
echo   夸夸镜 黑客松版 - 一键启动
echo ===================================
echo.

REM 检查依赖
python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo [步骤1/2] 正在安装必要的库（首次运行需要）...
    pip install flask requests --quiet
    if %errorlevel% neq 0 (
        echo.
        echo 安装失败，请手动运行: pip install flask requests
        pause
        exit /b 1
    )
    echo 安装完成！
) else (
    echo [步骤1/2] 依赖库已就绪
)

echo [步骤2/2] 启动夸夸镜·黑客松版...
echo.
echo ===================================
echo   浏览器打开: http://127.0.0.1:5680
echo ===================================
echo.

REM 3 秒后自动打开浏览器（用 127.0.0.1 走最快链路）
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:5680"

REM 启动服务器
python -u -X utf8 app.py

pause
