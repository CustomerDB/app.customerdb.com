import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import { bboxToRect } from './geom.js';

export default function HighlightModal(props) {
  if (props.data === undefined) {
    return <div></div>;
  }

  let rect = bboxToRect(props.bbox);

  let bboxText = JSON.stringify(props.bbox, null, 2);
  let rectText = JSON.stringify(rect, null, 2);

  let intersection = props.getIntersectingCallBack(
    props.bbox); // .map((item) => { return item.data.ID; });

  let intersectionText = JSON.stringify(intersection, null, 2);

  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.data['Note - Title']}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {props.data.Text}
        </p>
        <pre>
          id = {props.data.ID}
        </pre>
        <pre>
          bbox = {bboxText}
        </pre>
        <pre>
          rect = {rectText}
        </pre>
        <pre>
          intersection = {intersectionText}
        </pre>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}


