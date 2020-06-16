import rcolor from 'rcolor';

function getTextColorForBackground(hexcolor){
  hexcolor = hexcolor.replace("#", "");
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 170) ? '#000' : '#FFF';
}

export default function colorPair() {
  let background = rcolor();
  let foreground = getTextColorForBackground(background);

  return {
    background: background,
    foreground: foreground
  }
}
