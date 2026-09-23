export async function compressImage(file: File, maxEdge = 720, quality = 0.82) {
  if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
    throw new Error("Usa una imagen PNG o JPG.");
  }
  if (file.size > 4_000_000) throw new Error("La imagen pesa más de 4 MB.");
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("No pudimos leer la imagen")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length > 900000) reject(new Error("La imagen sigue siendo muy grande. Prueba con otra más ligera."));
      else resolve(data);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos leer la imagen")); };
    image.src = url;
  });
}
