from PIL import Image, ImageDraw
import os

# 创建图标尺寸
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]

# 创建一个简单的 PDF 图标
img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 绘制 PDF 文档图标 - 红色背景
draw.rectangle([30, 20, 226, 236], fill=(239, 68, 68), outline=(185, 28, 28), width=4)

# 折角效果
draw.polygon([(160, 20), (160, 70), (210, 20)], fill=(239, 68, 68))

# 内部白色区域
draw.rectangle([45, 35, 211, 221], fill=(255, 255, 255))

# 绘制文字区域（圆角矩形）
draw.rounded_rectangle([60, 70, 196, 160], fill=(239, 68, 68), radius=8)

# 保存多尺寸图标
icons = []
for size in sizes:
    icons.append(img.resize(size, Image.Resampling.LANCZOS))

# 保存为 .ico
icons[0].save(
    'public/icon.ico',
    format='ICO',
    sizes=sizes,
    append_images=icons[1:],
    quality=95
)
print("已生成 public/icon.ico")
