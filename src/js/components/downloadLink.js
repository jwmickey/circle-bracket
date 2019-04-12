import downloadjs from "downloadjs";
import Bracket from "../bracket";
import loadingGif from "../../img/loading.gif";

const loadingImg = new Image();
loadingImg.src = loadingGif;

export default (size, text, bracket) => {
  let link = document.createElement("a");
  link.className = "download";
  link.innerText = text;
  link.href = "#";
  link.addEventListener("click", function(e) {
    const prevText = this.innerText;
    this.childNodes[0].replaceWith(loadingImg);
    e.preventDefault();
    const sourceData = bracket.getBracketData();
    const dlCanvas = document.createElement("canvas");
    dlCanvas.width = size;
    dlCanvas.height = size;
    const dlBracket = new Bracket(dlCanvas);
    dlBracket.setBracket(sourceData);
    dlBracket
      .render()
      .then(() => {
        const image = dlBracket.getDataUrl("png");
        downloadjs(
          image,
          `circle-bracket-${sourceData.year}-${text.toLowerCase()}.png`,
          "image/png"
        );
      })
      .finally(() => {
        this.innerText = prevText;
      });
  });

  return link;
};
