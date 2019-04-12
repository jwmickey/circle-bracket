export default (size, cssSize, id = "canvas") => {
  const wrap = document.createElement("div");
  wrap.className = "canvas-wrap";
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";
  wrap.appendChild(canvas);

  const msg = document.createElement("h2");
  msg.className = "msg";
  wrap.appendChild(msg);

  return wrap;
};
