@echo off
title FileVault - Redis
echo Starting Redis on 127.0.0.1:6379...
cd /d "%~dp0bin\redis"
redis-server.exe redis.conf
