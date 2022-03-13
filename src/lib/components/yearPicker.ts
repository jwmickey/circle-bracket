export default (
  minYear: number,
  maxYear: number,
  value: number,
  onChange?: EventListener
): HTMLElement => {
  const years = Array.from(
    new Array(maxYear - minYear + 1),
    (x, i) => i + minYear
  ).reverse();

  let element = document.createElement("select");
  element.id = "year-picker";
  years.forEach((year) => {
    let option = document.createElement("option");
    option.value = year.toString();
    option.text = year.toString();
    element.appendChild(option);
  });
  element.value = value.toString();
  if (onChange) {
    element.addEventListener("change", onChange);
  }
  return element;
};
