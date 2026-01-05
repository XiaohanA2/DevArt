#!/bin/bash

# DevArt - rembg 背景移除服务启动脚本
# 
# 首次使用请先安装 rembg:
#   pip install "rembg[gpu,cli]"
# 
# 如果没有 GPU，使用 CPU 版本:
#   pip install "rembg[cli]"
#
# 更多信息: https://github.com/danielgatis/rembg

echo "🎨 启动 rembg 背景移除服务..."
echo "📍 服务地址: http://localhost:7000"
echo "📖 API 文档: http://localhost:7000/api"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动 rembg HTTP 服务
rembg s --host 0.0.0.0 --port 7000 --log_level info




