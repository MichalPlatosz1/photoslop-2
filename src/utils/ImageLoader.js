import PPMLoader from "./PPMLoader.js";

class ImageLoader {
  constructor() {
    this.ppmLoader = new PPMLoader();
  }

  async loadImage(file) {
    if (!file) {
      throw new Error("Nie wybrano pliku");
    }

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".ppm")) {
      try {
        const result = await this.ppmLoader.loadPPM(file);
        return {
          ...result,
          originalFormat: "ppm",
        };
      } catch (error) {
        throw error;
      }
    } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
      try {
        return await this.loadJPG(file);
      } catch (error) {
        throw error;
      }
    } else {
      const ext = fileName.split(".").pop() || "brak rozszerzenia";
      throw new Error(`Nieobsługiwany format pliku: .${ext}. Obsługiwane formaty: .ppm, .jpg, .jpeg`);
    }
  }

  async loadJPG(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Nie wybrano pliku"));
        return;
      }

      if (file.size === 0) {
        reject(new Error("Plik jest pusty"));
        return;
      }

      // Check file size (limit to 50MB to prevent browser crashes)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        reject(
          new Error(
            `Plik zbyt duży: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maksymalny rozmiar: ${maxSize / 1024 / 1024}MB`
          )
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          try {
            if (img.width <= 0 || img.height <= 0) {
              reject(new Error(`Nieprawidłowe wymiary obrazu: ${img.width}x${img.height}`));
              return;
            }

            const maxDimension = 32767; // Canvas size limit
            if (img.width > maxDimension || img.height > maxDimension) {
              reject(
                new Error(
                  `Obraz zbyt duży: ${img.width}x${img.height}. Maksymalny rozmiar: ${maxDimension}x${maxDimension}`
                )
              );
              return;
            }

            // Create a temporary canvas to extract pixel data
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("Nie można utworzyć kontekstu canvas"));
              return;
            }

            // Draw the image to extract pixel data
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            // Debug: sprawdź rzeczywiste wartości pikseli
            const data = imageData.data;
            let minR = 255,
              maxR = 0,
              minG = 255,
              maxG = 0,
              minB = 255,
              maxB = 0;
            let samplePixels = [];

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              minR = Math.min(minR, r);
              maxR = Math.max(maxR, r);
              minG = Math.min(minG, g);
              maxG = Math.max(maxG, g);
              minB = Math.min(minB, b);
              maxB = Math.max(maxB, b);

              // Zapisz próbki pikseli (co 1000. piksel)
              if (i % 4000 === 0) {
                samplePixels.push({r, g, b, index: i / 4});
              }
            }

            console.log("Analiza załadowanego obrazu JPG:");
            console.log(`Rozmiar: ${img.width}x${img.height}`);
            console.log(`Zakresy kolorów - R: ${minR}-${maxR}, G: ${minG}-${maxG}, B: ${minB}-${maxB}`);
            console.log("Próbka pierwszych pikseli:", samplePixels.slice(0, 10));

            resolve({
              width: img.width,
              height: img.height,
              data: imageData.data, // Uint8ClampedArray with RGBA data (already in 0-255 range)
              format: "JPG",
              originalFormat: "jpg",
              maxVal: 255,
            });
          } catch (error) {
            reject(new Error(`Błąd przetwarzania obrazu JPG: ${error.message}`));
          }
        };

        img.onerror = () => {
          reject(new Error("Nie można wczytać obrazu JPG. Plik może być uszkodzony lub w nieobsługiwanym formacie."));
        };

        try {
          img.src = event.target.result;
        } catch (error) {
          reject(new Error(`Błąd ustawiania źródła obrazu: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Błąd odczytu pliku"));
      };

      try {
        reader.readAsDataURL(file);
      } catch (error) {
        reject(new Error(`Błąd wczytywania pliku: ${error.message}`));
      }
    });
  }

  async getFileInfo(file) {
    if (!file) {
      throw new Error("Nie wybrano pliku");
    }

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith(".ppm")) {
        return await this.ppmLoader.getFileInfo(file);
      } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
        const imageData = await this.loadJPG(file);
        return {
          format: "JPG",
          width: imageData.width,
          height: imageData.height,
        };
      } else {
        const ext = fileName.split(".").pop() || "brak rozszerzenia";
        throw new Error(`Nieobsługiwany format pliku: .${ext}`);
      }
    } catch (error) {
      throw error;
    }
  }

  createImageData(imageData, ctx) {
    if (imageData.originalFormat === "ppm") {
      return this.ppmLoader.createImageData(imageData, ctx);
    } else {
      const imgData = ctx.createImageData(imageData.width, imageData.height);
      imgData.data.set(imageData.data);
      return imgData;
    }
  }

  async saveAsJPG(canvas, quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create JPG blob"));
          }
        },
        "image/jpeg",
        quality
      );
    });
  }

  async pixelBufferToJPG(pixelBuffer, quality = 0.92) {
    const canvas = document.createElement("canvas");
    canvas.width = pixelBuffer.width;
    canvas.height = pixelBuffer.height;
    const ctx = canvas.getContext("2d");

    const imageData = ctx.createImageData(pixelBuffer.width, pixelBuffer.height);
    imageData.data.set(pixelBuffer.getBuffer());
    ctx.putImageData(imageData, 0, 0);

    return this.saveAsJPG(canvas, quality);
  }
}

export default ImageLoader;
