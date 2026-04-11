export default (value, onChange) => {
  let element = document.createElement("select");
  element.id = "gender-picker";
  element.ariaLabel = "Choose Tournament";

  const options = [
    { value: "men", text: "Men's" },
    { value: "women", text: "Women's" }
  ];

  options.forEach(opt => {
    let option = document.createElement("option");
    option.value = opt.value;
    option.text = opt.text;
    element.appendChild(option);
  });

  element.value = value;
  if (onChange) {
    element.addEventListener("change", onChange);
  }
  return element;
};
