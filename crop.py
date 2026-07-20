from PIL import Image

def crop_transparent(image_path, output_path):
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    
    if bbox:
        # Crop the image to the bounding box
        img = img.crop(bbox)
        
        # We can also add a tiny bit of padding if desired, but for a favicon, filling the frame is best.
        # But let's just save it as is.
        img.save(output_path)
        print("Successfully cropped the image.")
    else:
        print("Image is entirely transparent.")

crop_transparent(r"c:\Users\ACER\Continuum\public\fArtboard 1.png", r"c:\Users\ACER\Continuum\public\favicon_cropped.png")
