#!/usr/bin/env python3
"""
PDF Merger 翻译服务 - 简化版
使用 deep-translator 实现中英互译

运行: python translate_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading
from deep_translator import GoogleTranslator

# 预加载翻译器
print("加载翻译器...")
try:
    zh_to_en = GoogleTranslator(source='zh-CN', target='en')
    en_to_zh = GoogleTranslator(source='en', target='zh-CN')
    print("翻译器加载成功!")
except Exception as e:
    print(f"加载翻译器失败: {e}")


class TranslateHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "status": "ok",
            "service": "PDF Merger 翻译服务"
        }).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode()
            data = json.loads(body)

            text = data.get('text', '')
            direction = data.get('direction', '')

            # 翻译
            if direction == 'zh2en':
                result = zh_to_en.translate(text)
            elif direction == 'en2zh':
                result = en_to_zh.translate(text)
            else:
                result = text

            response = json.dumps({
                "result": result,
                "original": text,
                "direction": direction
            })

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(response.encode())

            print(f"翻译: '{text}' -> '{result}' ({direction})")

        except Exception as e:
            print(f"翻译错误: {e}")
            self.send_response(500)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # 禁用默认日志


if __name__ == '__main__':
    PORT = 3001
    server = HTTPServer(('0.0.0.0', PORT), TranslateHandler)
    print(f"翻译服务运行在 http://localhost:{PORT}")
    print("按 Ctrl+C 停止")
    server.serve_forever()
