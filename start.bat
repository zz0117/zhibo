@echo off
chcp 65001 >nul
echo ========================================
echo    直播聚合平台 - 启动脚本
echo ========================================
echo.

REM 检查Node.js是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo.
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 显示Node.js版本
echo [信息] 检测到 Node.js 版本:
node --version
echo.

REM 检查是否已安装依赖
if not exist "node_modules\" (
    echo [信息] 首次运行，正在安装依赖包...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
) else (
    echo [信息] 依赖已存在，跳过安装步骤
    echo.
)

REM 启动服务器
echo ========================================
echo    正在启动服务器...
echo ========================================
echo.
echo [提示] 服务器启动后，请在浏览器中访问:
echo        http://localhost
echo.
echo [提示] 按 Ctrl+C 可以停止服务器
echo.
echo ========================================
echo.

node server.js

pause

