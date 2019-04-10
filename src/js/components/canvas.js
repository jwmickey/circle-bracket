export default (width, height, id = "canvas") => {
  const wrap = document.createElement("div");
  wrap.className = "canvas-wrap";
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.width = width;
  canvas.height = height;
  wrap.appendChild(canvas);
  return wrap;
};
