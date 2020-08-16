import React from "react";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import Switch from "@material-ui/core/Switch";

export default class Tags extends React.Component {
  onTagControlChange(e, tag) {
    let target = e.target;
    this.props.onChange(tag, target.checked);
  }

  render() {
    if (!this.props.tags) {
      return <></>;
    }

    let tagControls = Object.values(this.props.tags).map((t) => {
      let checked = this.props.tagIDsInSelection.has(t.ID);

      return (
        <FormControlLabel
					key={t.ID}
          label={t.name}
          control={
            <Switch
              key={t.ID}
              id={`tag-${t.ID}`}
              checked={checked}
              style={{ color: t.color }}
              onChange={(e) => {
                this.onTagControlChange(e, t);
              }}
            />
          }
        />
      );
    });

    return <FormGroup column>{tagControls}</FormGroup>;
  }
}

export function addTagStyles(tags) {
  console.debug("adding tag styles", tags);
  let tagStyleID = "documentTagStyle";
  let tagStyleElement = document.getElementById(tagStyleID);
  if (!tagStyleElement) {
    tagStyleElement = document.createElement("style");
    tagStyleElement.setAttribute("id", tagStyleID);
    tagStyleElement.setAttribute("type", "text/css");
    document.head.appendChild(tagStyleElement);
  }

  let styles = Object.values(tags).map((t) => {
    return `span.tag-${t.ID} { color: ${t.textColor}; background-color: ${t.color}; }`;
  });

  tagStyleElement.innerHTML = styles.join("\n");
}

export function removeTagStyles() {
  console.debug("removing tag styles");
  // Clean up tag styles
  let tagStyleID = "documentTagStyle";
  let styleElement = document.getElementById(tagStyleID);
  if (styleElement) {
    styleElement.remove();
  }
}
