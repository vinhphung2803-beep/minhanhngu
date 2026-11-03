from pathlib import Path
from PIL import Image, ImageDraw
import json

# Đường dẫn dự án
ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT / "incoming" / "batch_01"
PREVIEW_DIR = ROOT / "previews"

PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg", ".webp"}

results = []
preview_items = []

print("=== CMSN CON THƯ BÉO PHÌ ===")
print("AI ASSET PIPELINE - IMAGE CHECKER")
print()

# Quét ảnh trong thư mục đầu vào
for file in INPUT_DIR.iterdir():

    if not file.is_file():
        continue

    if file.suffix.lower() not in SUPPORTED_FORMATS:
        print(f"[SKIP] {file.name}: Định dạng chưa hỗ trợ")
        continue

    try:
        with Image.open(file) as image:

            width, height = image.size
            image_format = image.format
            mode = image.mode

            has_alpha = (
                "A" in image.getbands()
                or "transparency" in image.info
            )

            record = {
                "filename": file.name,
                "format": image_format,
                "width": width,
                "height": height,
                "mode": mode,
                "has_transparency": has_alpha,
                "file_size_kb": round(file.stat().st_size / 1024, 2),
                "valid": True
            }

            results.append(record)

            print(
                f"[OK] {file.name} | "
                f"{width}x{height} | "
                f"{mode} | "
                f"Transparency: {has_alpha}"
            )

            # Tạo ảnh xem trước, không sửa ảnh gốc
            thumbnail = image.convert("RGBA")
            thumbnail.thumbnail((160, 160))

            preview_items.append((file.name, thumbnail.copy()))

    except Exception as error:
        results.append({
            "filename": file.name,
            "valid": False,
            "error": str(error)
        })

        print(f"[ERROR] {file.name}: {error}")


# Tạo ảnh preview tổng hợp
if preview_items:

    cell_width = 200
    cell_height = 210
    columns = 3
    rows = (len(preview_items) + columns - 1) // columns

    sheet = Image.new(
        "RGB",
        (columns * cell_width, rows * cell_height),
        "#E8E8E8"
    )

    draw = ImageDraw.Draw(sheet)

    for index, (filename, thumbnail) in enumerate(preview_items):

        x = (index % columns) * cell_width
        y = (index // columns) * cell_height

        # Nền trắng cho ảnh trong suốt
        background = Image.new("RGBA", (160, 160), "white")
        background.alpha_composite(thumbnail)

        sheet.paste(background.convert("RGB"), (x + 20, y + 5))
        draw.text((x + 10, y + 175), filename[:28], fill="black")

    sheet.save(PREVIEW_DIR / "asset_preview.png")

    print("\nĐã tạo previews/asset_preview.png")

else:
    print("\nChưa có ảnh để tạo preview.")


# Ghi báo cáo JSON
report_path = PREVIEW_DIR / "asset_report.json"

with open(report_path, "w", encoding="utf-8") as report_file:
    json.dump(results, report_file, ensure_ascii=False, indent=4)

print(f"Đã tạo báo cáo: {report_path}")
print(f"Tổng số ảnh kiểm tra: {len(results)}")
print("\n=== HOÀN TẤT ===")
