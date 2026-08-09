import os
from PIL import Image

logo_path = r"f:\Paxlovid\src\assets\wu_ent_logo.jpg"
icons_dir = r"f:\Paxlovid\src-tauri\icons"

# Load the generated logo
img = Image.open(logo_path)

# Map of filenames to target sizes
png_sizes = {
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "Square30x30Logo.png": (30, 30),
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square89x89Logo.png": (89, 89),
    "Square107x107Logo.png": (107, 107),
    "Square142x142Logo.png": (142, 142),
    "Square150x150Logo.png": (150, 150),
    "Square284x284Logo.png": (284, 284),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
    "icon.png": (512, 512),
}

# Generate PNGs
for name, size in png_sizes.items():
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(os.path.join(icons_dir, name))
    print(f"Saved {name}")

# Generate icon.ico (containing standard sizes)
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_images = []
for size in ico_sizes:
    ico_images.append(img.resize(size, Image.Resampling.LANCZOS))

ico_path = os.path.join(icons_dir, "icon.ico")
# Save the first image, appending the rest as standard ICO sizes
ico_images[0].save(
    ico_path,
    format="ICO",
    append_images=ico_images[1:],
    sizes=[(i.width, i.height) for i in ico_images]
)
print("Saved icon.ico")
