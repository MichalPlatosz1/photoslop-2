class PPMLoader {
  constructor() {
    this.supportedFormats = ["P3", "P6"];
  }

  async loadPPM(file) {
    if (!file) {
      throw new Error("Nie wybrano pliku");
    }

    if (!file.name.toLowerCase().endsWith(".ppm")) {
      throw new Error("Nieobsługiwany format pliku. Wymagane rozszerzenie: .ppm");
    }

    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);

      if (uint8Array.length === 0) {
        throw new Error("Plik jest pusty");
      }

      return this.parsePPM(uint8Array);
    } catch (error) {
      if (
        error.message.includes("Nieobsługiwany format") ||
        error.message.includes("Invalid") ||
        error.message.includes("Insufficient") ||
        error.message.includes("Image too large") ||
        error.message.includes("Cannot allocate")
      ) {
        throw error;
      }
      throw new Error(`Błąd wczytywania pliku PPM: ${error.message}`);
    }
  }

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  parsePPM(data) {
    let offset = 0;

    try {
      const header = this.parseHeader(data);
      offset = header.dataOffset;

      const {format, width, height, maxVal} = header;

      if (!this.supportedFormats.includes(format)) {
        throw new Error(
          `Nieobsługiwany format PPM: ${format}. Obsługiwane formaty: ${this.supportedFormats.join(", ")}`
        );
      }

      let imageData;

      if (format === "P3") {
        imageData = this.parseP3Data(data, offset, width, height, maxVal);
      } else if (format === "P6") {
        imageData = this.parseP6Data(data, offset, width, height, maxVal);
      }

      return {
        width,
        height,
        data: imageData,
        format,
        maxVal,
      };
    } catch (error) {
      if (
        error.message.includes("Nieobsługiwany format") ||
        error.message.includes("Invalid") ||
        error.message.includes("Insufficient") ||
        error.message.includes("Image too large") ||
        error.message.includes("Cannot allocate")
      ) {
        throw error;
      }
      throw new Error(`Błąd parsowania pliku PPM: ${error.message}`);
    }
  }

  parseHeader(data) {
    let offset = 0;
    const tokens = [];
    let currentToken = "";
    let inComment = false;

    while (tokens.length < 4 && offset < data.length) {
      const char = String.fromCharCode(data[offset]);
      offset++;

      if (char === "#") {
        inComment = true;
        continue;
      }

      if (char === "\n") {
        inComment = false;
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = "";
        }
        continue;
      }

      if (inComment) {
        continue;
      }

      if (char === " " || char === "\t" || char === "\r") {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = "";
        }
        continue;
      }

      currentToken += char;
    }

    // Add the last token if it exists
    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }

    if (tokens.length < 4) {
      throw new Error(
        "Nieprawidłowy nagłówek PPM: za mało danych w nagłówku (wymagane: format, szerokość, wysokość, maxVal)"
      );
    }

    const format = tokens[0];
    const width = parseInt(tokens[1], 10);
    const height = parseInt(tokens[2], 10);
    const maxVal = parseInt(tokens[3], 10);

    if (isNaN(width) || isNaN(height) || isNaN(maxVal)) {
      throw new Error(
        `Nieprawidłowy nagłówek PPM: wartości nieliczbowe (szerokość: ${tokens[1]}, wysokość: ${tokens[2]}, maxVal: ${tokens[3]})`
      );
    }

    if (width <= 0 || height <= 0) {
      throw new Error(`Nieprawidłowe wymiary obrazu: ${width}x${height} (muszą być większe od 0)`);
    }

    if (maxVal <= 0 || maxVal > 65535) {
      throw new Error(`Nieprawidłowa wartość maxVal: ${maxVal} (dozwolony zakres: 1-65535)`);
    }

    return {
      format,
      width,
      height,
      maxVal,
      dataOffset: offset,
    };
  }

  parseP3Data(data, offset, width, height, maxVal) {
    const totalPixels = width * height;
    const arraySize = totalPixels * 4;

    // Browser-safe limit (400MB for RGBA data)
    // Included due to browsers being a bitch
    const browserSafeLimit = 104857600; // 100M elements = 400MB for RGBA
    if (arraySize > browserSafeLimit) {
      const maxPixels = Math.floor(browserSafeLimit / 4);
      const maxDimension = Math.floor(Math.sqrt(maxPixels));
      throw new Error(
        `Obraz zbyt duży: ${width}x${height} (${totalPixels} pikseli). Limit: ~${maxPixels} pikseli (~${maxDimension}x${maxDimension})`
      );
    }

    console.log(`P3: Tworzenie Uint8ClampedArray z ${arraySize} elementami dla obrazu ${width}x${height}`);

    let imageData;
    try {
      imageData = new Uint8ClampedArray(arraySize);
      console.log(`P3: Pomyślnie utworzono Uint8ClampedArray o długości: ${imageData.length}`);
    } catch (error) {
      console.error(`P3: Nie udało się utworzyć Uint8ClampedArray:`, error);
      console.error(`P3: Próbowany rozmiar: ${arraySize}, Limit: ${browserSafeLimit}`);
      throw new Error(`Nie można zaalokować pamięci dla obrazu ${width}x${height}. Wybierz mniejszy obraz.`);
    }

    const remainingData = data.slice(offset);
    let textData = "";
    const chunkSize = 65536; // 64KB chunks

    for (let i = 0; i < remainingData.length; i += chunkSize) {
      const chunk = remainingData.slice(i, i + chunkSize);
      textData += String.fromCharCode.apply(null, chunk);
    }

    const values = textData
      .split(/\s+/)
      .filter((val) => val.length > 0 && !val.startsWith("#"))
      .map((val) => parseInt(val, 10))
      .filter((val) => !isNaN(val));

    if (values.length < totalPixels * 3) {
      throw new Error(`Niewystarczające dane P3: oczekiwano ${totalPixels * 3} wartości, otrzymano ${values.length}`);
    }

    // Process pixels in blocks for efficiency with linear color scaling
    const blockSize = 1024; // Process 1024 pixels at a time

    for (let block = 0; block < Math.ceil(totalPixels / blockSize); block++) {
      const blockStart = block * blockSize;
      const blockEnd = Math.min(blockStart + blockSize, totalPixels);

      for (let i = blockStart; i < blockEnd; i++) {
        const valueIndex = i * 3;
        const imageIndex = i * 4;

        // Linear color scaling: normalize values to 0-255 range
        const r = Math.round((values[valueIndex] / maxVal) * 255);
        const g = Math.round((values[valueIndex + 1] / maxVal) * 255);
        const b = Math.round((values[valueIndex + 2] / maxVal) * 255);

        imageData[imageIndex] = r;
        imageData[imageIndex + 1] = g;
        imageData[imageIndex + 2] = b;
        imageData[imageIndex + 3] = 255; // Alpha
      }
    }

    return imageData;
  }

  parseP6Data(data, offset, width, height, maxVal) {
    const totalPixels = width * height;
    const arraySize = totalPixels * 4; // RGBA

    // Browser-safe limit (400MB for RGBA data)
    // Included due to browsers being a bitch
    const browserSafeLimit = 104857600; // 100M elements = 400MB for RGBA
    if (arraySize > browserSafeLimit) {
      const maxPixels = Math.floor(browserSafeLimit / 4);
      const maxDimension = Math.floor(Math.sqrt(maxPixels));
      throw new Error(
        `Obraz zbyt duży: ${width}x${height} (${totalPixels} pikseli). Limit: ~${maxPixels} pikseli (~${maxDimension}x${maxDimension})`
      );
    }

    console.log(`P6: Tworzenie Uint8ClampedArray z ${arraySize} elementami dla obrazu ${width}x${height}`);

    let imageData;
    try {
      imageData = new Uint8ClampedArray(arraySize);
      console.log(`P6: Pomyślnie utworzono Uint8ClampedArray o długości: ${imageData.length}`);
    } catch (error) {
      console.error(`P6: Nie udało się utworzyć Uint8ClampedArray:`, error);
      console.error(`P6: Próbowany rozmiar: ${arraySize}, Limit: ${browserSafeLimit}`);
      throw new Error(`Nie można zaalokować pamięci dla obrazu ${width}x${height}. Wybierz mniejszy obraz.`);
    }

    const bytesPerChannel = maxVal > 255 ? 2 : 1;
    const expectedBytes = totalPixels * 3 * bytesPerChannel;

    if (data.length - offset < expectedBytes) {
      throw new Error(
        `Niewystarczające dane P6: oczekiwano ${expectedBytes} bajtów, otrzymano ${data.length - offset}`
      );
    }

    // Process pixels in blocks for efficiency with linear color scaling
    const blockSize = 1024; // Process 1024 pixels at a time

    for (let block = 0; block < Math.ceil(totalPixels / blockSize); block++) {
      const blockStart = block * blockSize;
      const blockEnd = Math.min(blockStart + blockSize, totalPixels);

      for (let i = blockStart; i < blockEnd; i++) {
        const sourceIndex = offset + i * 3 * bytesPerChannel;
        const imageIndex = i * 4;

        let r, g, b;

        if (bytesPerChannel === 1) {
          r = data[sourceIndex];
          g = data[sourceIndex + 1];
          b = data[sourceIndex + 2];
        } else {
          r = (data[sourceIndex] << 8) | data[sourceIndex + 1];
          g = (data[sourceIndex + 2] << 8) | data[sourceIndex + 3];
          b = (data[sourceIndex + 4] << 8) | data[sourceIndex + 5];
        }

        // Linear color scaling: normalize to 0-255 range
        imageData[imageIndex] = Math.round((r / maxVal) * 255);
        imageData[imageIndex + 1] = Math.round((g / maxVal) * 255);
        imageData[imageIndex + 2] = Math.round((b / maxVal) * 255);
        imageData[imageIndex + 3] = 255; // Alpha
      }
    }

    return imageData;
  }

  createImageData(ppmData, ctx) {
    const imageData = ctx.createImageData(ppmData.width, ppmData.height);
    imageData.data.set(ppmData.data);
    return imageData;
  }

  async getFileInfo(file) {
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 1024)); // Read first 1KB for header

      const header = this.parseHeader(uint8Array);
      return {
        format: header.format,
        width: header.width,
        height: header.height,
        maxVal: header.maxVal,
        size: file.size,
        name: file.name,
      };
    } catch (error) {
      throw new Error(`Nieprawidłowy plik PPM: ${error.message}`);
    }
  }
}

export default PPMLoader;
