export default (years = [], value, onChange) => {
  let element = document.createElement("select");
  element.id = "year-picker";
  years.forEach(year => {
    let option = document.createElement("option");
    option.value = year;
    option.text = year;
    element.appendChild(option);
  });
  element.value = value;
  if (onChange) {
    element.addEventListener("change", onChange);
  }
  return element;
};
