from rembg import remove
from PIL import Image

input_path = 'static/images/logo.png'
output_path = 'static/images/logo.png'

print(f"Removing background from {input_path}...")
input_image = Image.open(input_path)
output_image = remove(input_image)
output_image.save(output_path, "PNG")
print("Done! Background removed.")
