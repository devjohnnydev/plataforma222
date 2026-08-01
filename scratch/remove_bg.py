from PIL import Image

img = Image.open('static/images/logo.png').convert("RGBA")
datas = img.getdata()

newData = []
# Threshold for "black"
for item in datas:
    # item is (R, G, B, A)
    # If the pixel is very dark (almost black), make it transparent
    if item[0] < 30 and item[1] < 30 and item[2] < 30:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save('static/images/logo.png', "PNG")
print("Background removed.")
