@echo off
title FileVault - Meilisearch
echo Starting Meilisearch on http://127.0.0.1:7700...
set MEILI_MASTER_KEY=d118a2cd90c22467107f3bf15b52eee7
set MEILI_ENV=development
set MEILI_DB_PATH=%~dp0data\meili_data
"%~dp0bin\meilisearch.exe"
