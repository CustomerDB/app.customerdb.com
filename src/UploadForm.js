import React from 'react';
import { useState, useRef } from 'react';
import Popover from 'react-bootstrap/Popover';
import Overlay from 'react-bootstrap/Overlay';
import Button from 'react-bootstrap/Button';

export default function UploadForm(props) {
    const [show, setShow] = useState(false);
    const [target, setTarget] = useState(null);
    const ref = useRef(null);
  
    const handleClick = (event) => {
      setShow(!show);
      setTarget(event.target);
    };
  
    const handleHide = (event) => {
      setShow(!show);
    }
  
    return (
      <div ref={ref}>
        <Button onClick={handleClick}>Add dataset</Button>
        <Overlay
          show={show}
          target={target}
          placement="bottom"
          container={ref.current}
          rootClose={true}
          onHide={handleHide}
        >
          <Popover id="popover-contained">
            <Popover.Title as="h3">Add dataset</Popover.Title>
            <Popover.Content>
              <input type="file" className="file-select" accept=".csv" onChange={props.handleFileUploadChange}/>
              <br/>
              <br/>
              <Button onClick={() => {props.handleFileUploadSubmit(); handleHide();}}>Upload</Button>
            </Popover.Content>
          </Popover>
        </Overlay>
      </div>
    );
  }