export function initWaveform(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = 80;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#38bdf8";
    const bars = 40;

    for (let i = 0; i < bars; i++) {
      const height = Math.random() * canvas.height;
      ctx.fillRect(i * 10, canvas.height - height, 6, height);
    }

    requestAnimationFrame(draw);
  }

  draw();
}