import React from 'react';
import Form from 'react-bootstrap/Form';

export default class Tags extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = props.onChange;
  }

  onTagControlChange(e, tag) {
    let target = e.target;
    this.onChange(tag, target.checked);
  }

  render() {
    let tagControls = this.props.tags.map(t => {
      let checked = this.props.tagIDsInSelection.has(t.ID);

      let label = <span style={{
        color: t.textColor
      }}>{t.name}</span>;

      return <Form.Switch
        key={t.ID}
        id={`tag-${t.ID}`}
        checked={checked}
        style={{
          background: t.color,
          borderRadius: "0.25rem",
          marginBottom: "0.25rem",
        }}
        label={label}
        title={t.name}
        onClick={(e) => {this.onTagControlChange(e, t)}}/>
    });

    return <div>
      Tags<br />
      {tagControls.length > 0 ? tagControls : <small>None</small>}
    </div>;
  }
}


export function addTagStyles(tags) {
  console.debug("adding tag styles", tags)
  let tagStyleID = "documentTagStyle"
  let tagStyleElement = document.getElementById(tagStyleID);
  if (!tagStyleElement) {
    tagStyleElement = document.createElement("style");
    tagStyleElement.setAttribute("id", tagStyleID);
    tagStyleElement.setAttribute("type", "text/css");
    document.head.appendChild(tagStyleElement);
  }

  let styles = Object.values(tags).map(t => {
    return `span.tag-${t.ID} { color: ${t.textColor}; background-color: ${t.color}; }`;
  });

  tagStyleElement.innerHTML = styles.join("\n");
}

export function removeTagStyles() {
  console.debug("removing tag styles")
  // Clean up tag styles
  let tagStyleID = "documentTagStyle";
  let styleElement = document.getElementById(tagStyleID);
  if (styleElement) {
    styleElement.remove();
  }
}