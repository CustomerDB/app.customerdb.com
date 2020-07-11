import React, { useState } from 'react';

import Dropdown from 'react-bootstrap/Dropdown';
import { ThreeDotsVertical } from 'react-bootstrap-icons';

/**
 * Creates a "three vertical dot" drop down.
 * 
 * inverted: false
 * 
 */
export default function Options(props) {
    let threedots = <ThreeDotsVertical />;
    if (props.inverted === true) {
        threedots = <ThreeDotsVertical color="white" />;
    }

    let list = props.options.map((option) => {
        return <Dropdown.Item onClick={() => {option.onClick(props.item)}}>{option.name}</Dropdown.Item>;
    });

    return <Dropdown style={{ width: "2.5rem", marginLeft: "auto" }}>
    <Dropdown.Toggle variant="link" className="threedots">
      {threedots}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      {list}
    </Dropdown.Menu>
  </Dropdown>;
}