from PIL import Image, ImageDraw, ImageFont

W, H = 1700, 1000

def add_box(draw, x, y, w, h, title, color, subtitle=None):
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=color)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, outline=(50, 50, 50), width=2)

    title_font = ImageFont.truetype("arial.ttf", 28)
    body_font = ImageFont.truetype("arial.ttf", 20)

    draw.text((x + 20, y + 18), title, fill=(15, 15, 15), font=title_font)
    if subtitle:
        lines = subtitle.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x + 20, y + 62 + idx * 28), line, fill=(30, 30, 30), font=body_font)


def add_arrow(draw, x1, y1, x2, y2):
    draw.line((x1, y1, x2, y2), fill=(40, 40, 40), width=4)
    dx = x2 - x1
    dy = y2 - y1
    length = (dx**2 + dy**2) ** 0.5
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    px, py = x2 - ux * 18, y2 - uy * 18
    left = (px - uy * 12, py + ux * 12)
    right = (px + uy * 12, py - ux * 12)
    draw.polygon([(x2, y2), left, right], fill=(40, 40, 40))


def system_arch():
    img = Image.new("RGB", (W, H), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, W, H), fill=(245, 245, 245))
    draw.line((80, 110, W - 80, 110), fill=(120, 120, 120), width=3)

    title_font = ImageFont.truetype("arial.ttf", 44)
    draw.text((80, 40), "Deduction Defender - System Architecture", fill=(20, 20, 20), font=title_font)

    # Left user area
    add_box(draw, 80, 180, 260, 250, "Frontend", (200, 230, 255), "React App\n- Analyst chat\n- Upload evidence\n- Review dashboard")

    add_box(draw, 440, 220, 290, 200, "FastAPI Backend", (205, 240, 205), "REST API\n- /api/chat\n- /api/upload\n- /health")

    add_box(draw, 820, 170, 290, 260, "RocketRide Pipelines", (255, 232, 180), "Chat pipeline\nUpload pipeline\nGemini LLM reasoning\nPrompt + response flow")

    add_box(draw, 1230, 200, 320, 220, "Data Sources", (225, 210, 240), "Remittances\nPromotion contracts\nShipment records\nPolicy manuals")

    add_box(draw, 520, 560, 420, 220, "Decision Layer", (210, 235, 230), "Deduction classification\n- Valid\n- Invalid\n- Analyst review\n- Dispute recommendation")

    add_box(draw, 1035, 560, 420, 220, "Output", (200, 220, 200), "Evidence summary\nDispute guidance\nRevenue recovery logic\nEscalation actions")

    add_arrow(draw, 340, 305, 440, 305)
    add_arrow(draw, 730, 305, 820, 305)
    add_arrow(draw, 1110, 305, 1230, 305)
    add_arrow(draw, 610, 430, 610, 560)
    add_arrow(draw, 1000, 630, 1035, 630)

    # Arrow from pipeline to decision
    add_arrow(draw, 940, 430, 940, 610)

    img.save("d:\\Shivam\\Projects\\DeductionDefender\\architectures\\deduction_defender_system_architecture.jpg", quality=95)


def pipeline_arch():
    img = Image.new("RGB", (W, H), color=(248, 248, 248))
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype("arial.ttf", 42)
    draw.text((80, 40), "Deduction Defender - RocketRide Pipeline Flow", fill=(20, 20, 20), font=title_font)

    add_box(draw, 90, 180, 250, 200, "Chat or Upload", (210, 230, 255), "User input\n- deduction case\n- PDF / remittance\n- policy evidence")
    add_box(draw, 430, 180, 270, 200, "Prompt Node", (255, 240, 200), "Analyst instructions\n- compare contract\n- check evidence\n- classify action")
    add_box(draw, 780, 180, 300, 200, "Gemini LLM", (240, 255, 200), "Reasoning engine\n- valid vs invalid\n- dispute logic\n- escalation")
    add_box(draw, 1170, 180, 330, 200, "Response Node", (205, 240, 215), "Final answer\n- rationale\n- evidence\n- decision\n- next action")

    add_box(draw, 300, 510, 350, 180, "Remittance", (220, 220, 240), "Payment data")
    add_box(draw, 700, 510, 350, 180, "Promotions", (220, 220, 240), "Retail contracts")
    add_box(draw, 1100, 510, 350, 180, "Shipment", (220, 220, 240), "Fulfillment data")

    add_arrow(draw, 340, 280, 430, 280)
    add_arrow(draw, 700, 280, 780, 280)
    add_arrow(draw, 1080, 280, 1170, 280)

    add_arrow(draw, 555, 380, 480, 510)
    add_arrow(draw, 895, 380, 870, 510)
    add_arrow(draw, 930, 380, 1180, 510)

    img.save("d:\\Shivam\\Projects\\DeductionDefender\\architectures\\rocketride_pipeline_architecture.jpg", quality=95)


if __name__ == "__main__":
    system_arch()
    pipeline_arch()
    print("Architecture JPG files created in the architectures folder.")
