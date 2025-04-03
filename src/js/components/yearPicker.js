export default (minYear, maxYear, value, onChange) => {
  const years = Array.from(
    new Array(maxYear - minYear + 1),
    (x, i) => i + minYear
  ).reverse();

  let element = document.createElement("select");
  element.id = "year-picker";
  element.ariaLabel = "Choose Tournament Year";
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
