// Redimensiona a foto no proprio navegador antes de enviar ao backend.
// Reduz tempo de upload, custo/latencia da chamada a Groq, e evita esbarrar
// no limite de 15mb do backend com fotos de celular em altissima resolucao.
// 1024px no lado maior e mais que suficiente para o modelo de visao ler
// 9 blocos de cor grandes como os de um cubo magico.
export function downscaleImage(dataUrl, maxSide = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}