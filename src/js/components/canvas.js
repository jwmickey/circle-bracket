export default (width, height, id = "canvas") => {
  const element = document.createElement("canvas");
  element.id = id;
  element.width = width;
  element.height = height;
  return element;
};
