/* =====================================================
   PIPGO · IMAGE SERVICE
   Compresión de imágenes + subida a Cloudinary (unsigned).
   Proyecto: PIPGO-v1
   Cloud: tugqycpq
   Preset: pipgo_images
   ===================================================== */

window.ImageService = {

    /* =================================================
       COMPRESIÓN DE IMAGEN
       Recibe un File, Blob o URL. Devuelve un Blob JPEG
       redimensionado al máximo definido en CONFIG.IMAGE_MAX_DIM.
       Usa canvas + toBlob. Fallback a dataURL si toBlob no existe.
       ================================================= */
    compressImage(source) {
        return new Promise((resolve, reject) => {
            let objectUrl = null;
            const isBlobSource = source instanceof Blob;
            objectUrl = isBlobSource ? URL.createObjectURL(source) : source;

            const img = new Image();

            img.onload = () => {
                try {
                    const maxDim = CONFIG.IMAGE_MAX_DIM;
                    let width = img.width;
                    let height = img.height;

                    // Redimensionado proporcional si excede el máximo
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                    // Callback unificado: revoca el objectURL y resuelve/rechaza
                    const handleBlob = (blob) => {
                        if (isBlobSource && objectUrl) URL.revokeObjectURL(objectUrl);
                        blob ? resolve(blob) : reject(new Error('No se pudo crear el blob de imagen.'));
                    };

                    // Ruta preferida: canvas.toBlob
                    if (typeof canvas.toBlob === 'function') {
                        canvas.toBlob(handleBlob, 'image/jpeg', CONFIG.IMAGE_QUALITY);
                    } else {
                        // Fallback para WebViews antiguos sin toBlob
                        const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.IMAGE_QUALITY);
                        const binary = atob(dataUrl.split(',')[1]);
                        const array = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                        handleBlob(new Blob([array], { type: 'image/jpeg' }));
                    }
                } catch (err) {
                    if (isBlobSource && objectUrl) URL.revokeObjectURL(objectUrl);
                    reject(err);
                }
            };

            img.onerror = () => {
                if (isBlobSource && objectUrl) URL.revokeObjectURL(objectUrl);
                reject(new Error('No se pudo leer la imagen seleccionada.'));
            };

            img.src = objectUrl;
        });
    },

    /* =================================================
       SUBIDA A CLOUDINARY (unsigned)
       Lee Cloud Name y Upload Preset desde CONFIG.
       No usa API Key/Secret (no van en el frontend).
       Devuelve { secure_url, public_id }.
       ================================================= */
    async uploadImageToCloudinary(blob) {
        const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = CONFIG;

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            throw new Error('Cloudinary no está configurado.');
        }

        const formData = new FormData();
        formData.append('file', blob, 'image.jpg');
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.IMAGE_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) {
                let message = 'No se pudo subir la imagen.';
                try {
                    const data = await response.json();
                    if (data && data.error && data.error.message) {
                        message = data.error.message;
                    }
                } catch (e) { /* respuesta no JSON, ignorar */ }
                throw new Error(message);
            }

            const data = await response.json();
            if (!data.secure_url) {
                throw new Error('Cloudinary no devolvió una URL segura.');
            }

            return {
                secure_url: data.secure_url,
                public_id: data.public_id || ''
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('La subida de imagen tardó demasiado.');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
};