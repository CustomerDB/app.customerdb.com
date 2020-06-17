import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function HighlightModal(props) {
  if (props.highlight === undefined) {
    return <div></div>;
  }

  let rectText = JSON.stringify(props.rect, null, 2);

  let highlightText = JSON.stringify(props.highlight, null, 2);

  let cardText = JSON.stringify(props.card, null, 2);

  let intersection = props.getIntersectingCallBack(props.rect);

  let intersectionText = JSON.stringify(intersection, null, 2);

  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.highlight['Note - Title']}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {props.highlight.Text}
        </p>
        <pre>
          id = {props.highlight.ID}
        </pre>
        <pre>
          highlight = {highlightText}
        </pre>
        <pre>
          card = {cardText}
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


