import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from pyzbar.pyzbar import decode

def create_stylish_upi_qr():
    # Target dimensions: perfectly proportioned card
    W, H = 680, 1020
    
    # Clean standard fonts (avoid missing emoji glyph boxes)
    font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 23)
    font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 13)
    font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 12)
    font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 13)
    font_warn = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 12)
    font_receiver_name = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
    font_mono = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 17)
    font_amount = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 21)
    font_apps = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 12)
    font_footer = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)

    # 1. Base Image with Deep Cosmic Navy Gradient
    card = Image.new("RGBA", (W, H), (11, 15, 33, 255))
    draw = ImageDraw.Draw(card)

    for y in range(H):
        r = int(10 + (20 - 10) * (y / H))
        g = int(13 + (26 - 13) * (y / H))
        b = int(30 + (54 - 30) * (y / H))
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Dual Glowing Border (Violet & Cyan)
    draw.rounded_rectangle([2, 2, W - 3, H - 3], radius=24, outline=(124, 58, 237, 200), width=2)
    draw.rounded_rectangle([4, 4, W - 5, H - 5], radius=22, outline=(56, 189, 248, 80), width=1)

    # Top Gradient Line (Violet -> Cyan -> Gold)
    for x in range(W - 8):
        frac = x / (W - 8)
        if frac < 0.5:
            f = frac / 0.5
            cr = int(124 + (6 - 124) * f)
            cg = int(58 + (182 - 58) * f)
            cb = int(237 + (212 - 237) * f)
        else:
            f = (frac - 0.5) / 0.5
            cr = int(6 + (245 - 6) * f)
            cg = int(182 + (158 - 182) * f)
            cb = int(212 + (11 - 212) * f)
        draw.line([(x + 4, 4), (x + 4, 9)], fill=(cr, cg, cb, 255))

    # 2. Header with IET Logo
    if os.path.exists("Ietlogo.png"):
        iet_raw = Image.open("Ietlogo.png").convert("RGBA")
        logo_size = 64
        iet_logo = iet_raw.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        mask = Image.new("L", (logo_size, logo_size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, logo_size - 1, logo_size - 1], fill=255)
        
        logo_x, logo_y = 42, 32
        draw.ellipse([logo_x - 3, logo_y - 3, logo_x + logo_size + 2, logo_y + logo_size + 2], 
                     fill=(255, 255, 255, 255), outline=(56, 189, 248, 220), width=2)
        card.paste(iet_logo, (logo_x, logo_y), mask)
    
    draw.text((122, 30), "IET LUCKNOW • FRESHERS 2026", fill=(255, 255, 255), font=font_title)
    draw.text((122, 60), "Department of Master of Computer Applications (MCA)", fill=(56, 189, 248), font=font_sub)
    draw.text((122, 80), "Organized by MCA Batch of 2025–2027 • IET Lucknow", fill=(148, 163, 184), font=font_small)

    # 3. Badge Banner: OFFICIAL AUTHORIZED UPI QR
    badge_x1, badge_y1, badge_x2, badge_y2 = 42, 114, W - 42, 148
    draw.rounded_rectangle([badge_x1, badge_y1, badge_x2, badge_y2], radius=17, fill=(35, 26, 12, 230), outline=(245, 158, 11, 220), width=1)
    badge_text = "OFFICIAL AUTHORIZED UPI QR CODE • ENTRY PASS Rs 99 ONLY"
    bw = draw.textlength(badge_text, font=font_badge)
    draw.text(((W - bw) / 2, badge_y1 + 7), badge_text, fill=(245, 158, 11), font=font_badge)

    # 4. Generate Core QR Code using Exact Payload
    payload = "upi://pay?pa=8006770753-2@ibl&pn=BHANU%20PRTAP%20SINGH&mc=0000&mode=02&purpose=00"
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=11,
        border=3
    )
    qr.add_data(payload)
    qr.make(fit=True)

    # Styled QR with deep dark slate/navy modules
    qr_styled = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(front_color=(15, 23, 42), back_color=(255, 255, 255))
    )
    qr_pil = qr_styled._img.convert("RGBA")

    # Resize QR to fit smoothly inside plate
    qr_target_size = 450
    qr_resized = qr_pil.resize((qr_target_size, qr_target_size), Image.Resampling.LANCZOS)

    # White Plate dimensions
    plate_w, plate_h = 490, 490
    plate_x1 = int((W - plate_w) / 2)
    plate_y1 = 168
    plate_x2 = plate_x1 + plate_w
    plate_y2 = plate_y1 + plate_h

    # Glow under the plate
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle([plate_x1 - 6, plate_y1 - 6, plate_x2 + 6, plate_y2 + 6], radius=24, fill=(124, 58, 237, 70))
    glow_draw.rounded_rectangle([plate_x1 - 2, plate_y1 - 2, plate_x2 + 2, plate_y2 + 2], radius=22, fill=(56, 189, 248, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    card = Image.alpha_composite(card, glow)
    draw = ImageDraw.Draw(card)

    # Draw White Plate with crisp border
    draw.rounded_rectangle([plate_x1, plate_y1, plate_x2, plate_y2], radius=20, fill=(255, 255, 255, 255), outline=(199, 210, 254, 255), width=2)

    # Paste QR Code on White Plate
    qr_pos_x = plate_x1 + int((plate_w - qr_target_size) / 2)
    qr_pos_y = plate_y1 + int((plate_h - qr_target_size) / 2)
    card.paste(qr_resized, (qr_pos_x, qr_pos_y), qr_resized)

    # Center Badge (PhonePe Icon)
    badge_diameter = 74
    center_x = qr_pos_x + int(qr_target_size / 2)
    center_y = qr_pos_y + int(qr_target_size / 2)
    
    # White background disc behind center logo
    draw.ellipse([center_x - badge_diameter//2 - 4, center_y - badge_diameter//2 - 4,
                  center_x + badge_diameter//2 + 4, center_y + badge_diameter//2 + 4],
                 fill=(255, 255, 255, 255), outline=(124, 58, 237, 255), width=2)

    # Purple PhonePe circle
    draw.ellipse([center_x - badge_diameter//2, center_y - badge_diameter//2,
                  center_x + badge_diameter//2, center_y + badge_diameter//2],
                 fill=(95, 37, 159, 255))
    
    if os.path.exists("scratch_phonepe_badge.png"):
        raw_b = Image.open("scratch_phonepe_badge.png").convert("RGBA")
        inner = raw_b.crop((12, 12, 78, 78))
        inner_resized = inner.resize((badge_diameter - 8, badge_diameter - 8), Image.Resampling.LANCZOS)
        c_mask = Image.new("L", (badge_diameter - 8, badge_diameter - 8), 0)
        ImageDraw.Draw(c_mask).ellipse([0, 0, badge_diameter - 9, badge_diameter - 9], fill=255)
        card.paste(inner_resized, (center_x - (badge_diameter - 8)//2, center_y - (badge_diameter - 8)//2), c_mask)

    # 5. Receiver Verification Box
    box_x1, box_y1, box_x2, box_y2 = 42, 680, W - 42, 865
    draw.rounded_rectangle([box_x1, box_y1, box_x2, box_y2], radius=16, fill=(15, 20, 42, 240), outline=(239, 68, 68, 220), width=2)
    
    # Solid Red Top Header Stripe inside Box
    draw.rounded_rectangle([box_x1 + 1, box_y1 + 1, box_x2 - 1, box_y1 + 32], radius=14, fill=(220, 38, 38, 255))
    draw.text((box_x1 + 18, box_y1 + 7), "IMPORTANT: VERIFY RECEIVER NAME BEFORE PAYMENT", fill=(255, 255, 255), font=font_warn)

    # Receiver Name in Bold Vibrant Red
    receiver_name = "BHANU PRATAP SINGH (DSW)"
    draw.text((box_x1 + 18, box_y1 + 42), receiver_name, fill=(239, 68, 68), font=font_receiver_name)

    # Divider line
    draw.line([(box_x1 + 18, box_y1 + 80), (box_x2 - 18, box_y1 + 80)], fill=(40, 48, 80, 255), width=1)

    # Left: UPI ID
    draw.text((box_x1 + 18, box_y1 + 92), "AUTHORIZED UPI ID:", fill=(148, 163, 184), font=font_small)
    draw.text((box_x1 + 18, box_y1 + 112), "8006770753-2@ibl", fill=(56, 189, 248), font=font_mono)

    # Right: Amount Pill
    amt_x = box_x2 - 195
    draw.rounded_rectangle([amt_x, box_y1 + 92, box_x2 - 18, box_y1 + 144], radius=10, fill=(35, 26, 12, 240), outline=(245, 158, 11, 220), width=1)
    draw.text((amt_x + 14, box_y1 + 97), "PASS FEE:", fill=(203, 213, 225), font=ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 10))
    draw.text((amt_x + 14, box_y1 + 112), "Rs 99.00 ONLY", fill=(245, 158, 11), font=font_amount)

    # Security Verification Tag
    draw.text((box_x1 + 18, box_y1 + 150), "[OK] Verified Official Account • MCA 2025-2027 Committee", fill=(52, 211, 153), font=font_small)

    # 6. Accepted Apps Bar
    apps_text = "ACCEPTED APPS: PhonePe • Google Pay • Paytm • BHIM • Cred • Any UPI App"
    aw = draw.textlength(apps_text, font=font_apps)
    draw.text(((W - aw) / 2, 892), apps_text, fill=(203, 213, 225), font=font_apps)

    # 7. Footer Notice
    footer1 = "Strictly pay ONLY to this official QR code • Fake UTRs will result in Pass Rejection"
    footer2 = "Institute of Engineering & Technology (IET), Lucknow • MCA Freshers 2026"
    fw1 = draw.textlength(footer1, font=font_footer)
    fw2 = draw.textlength(footer2, font=font_footer)
    draw.text(((W - fw1) / 2, 928), footer1, fill=(148, 163, 184), font=font_footer)
    draw.text(((W - fw2) / 2, 948), footer2, fill=(100, 116, 139), font=font_footer)

    # Save outputs:
    # 1. Backup original if not already backed up
    if not os.path.exists("assets/upi-qr-original.png") and os.path.exists("assets/upi-qr.png"):
        os.rename("assets/upi-qr.png", "assets/upi-qr-original.png")
        print("Backed up original to assets/upi-qr-original.png")

    card_rgb = card.convert("RGB")
    
    # Save stylish version
    card_rgb.save("assets/upi-qr-stylish.png", quality=95)
    # Save directly as assets/upi-qr.png so dashboard instantly reflects it
    card_rgb.save("assets/upi-qr.png", quality=95)
    print("Saved assets/upi-qr.png & assets/upi-qr-stylish.png")

    # VERIFY DECODING WITH PYZBAR!
    decoded = decode(card_rgb)
    print("Verification count:", len(decoded))
    assert len(decoded) > 0, "QR decode failed!"
    print("Decoded payload:", decoded[0].data.decode("utf-8"))
    assert decoded[0].data.decode("utf-8") == payload, "Payload mismatch!"
    print("ALL VERIFICATIONS PASSED! 100% SCAN-ABLE!")

if __name__ == "__main__":
    create_stylish_upi_qr()
