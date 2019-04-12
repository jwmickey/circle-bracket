export const aboutLink = () => {
  let element = document.createElement("a");
  element.className = "about-link";
  element.innerText = "About";
  element.href = "#";
  element.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("about").classList.remove("hide");
  });
  return element;
};

export const aboutOverlay = () => {
  let element = document.createElement("div");
  element.id = "about";
  element.className = "about hide";
  element.innerHTML =
    "<p>This is an educational website with the intention of presenting historical data in a unique format.</p> " +
    "<p>The logos used on this website are owned by their respective institutions.  No images displayed or generated may be used for commercial purposes.</p>" +
    "<p>This site is not affiliated with the NCAA or any of its members.</p>";
  element.addEventListener("click", e => {
    e.preventDefault();
    element.classList.add("hide");
  });
  return element;
};
