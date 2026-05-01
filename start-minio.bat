@echo off
title FileVault - MinIO
echo Starting MinIO on http://127.0.0.1:9000 (console: http://127.0.0.1:9001)
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=8b17d9d648142e418401ae64e3a4336a
"%~dp0bin\minio.exe" server "%~dp0data\minio" --console-address ":9001"
