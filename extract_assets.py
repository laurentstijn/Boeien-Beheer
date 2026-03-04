import fitz # PyMuPDF
import sys

def extract_images(pdf_path, out_dir):
    try:
        doc = fitz.open(pdf_path)
        for page_index in range(len(doc)):
            page = doc[page_index]
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                with open(f"{out_dir}/extracted_logo_{img_index}.{image_ext}", "wb") as f:
                    f.write(image_bytes)
        print("Done extracting images.")
    except Exception as e:
        print(f"Failed to extract: {e}")

if __name__ == "__main__":
    extract_images(sys.argv[1], sys.argv[2])
