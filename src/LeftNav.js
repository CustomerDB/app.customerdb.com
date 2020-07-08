import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { DoorOpen, PieChart, People, ChatLeftQuote, GearWide, Intersect } from 'react-bootstrap-icons';

import { useNavigate } from "react-router-dom";

export default function LeftNav(props) {
  let buttonVariants = {
    'people': 'link',
    'documents': 'link',
    'datasets': 'link'
  };
  buttonVariants[props.active] = 'primary';

  let navigate = useNavigate();

  return <div className="navLeft">
    <div>
    <OverlayTrigger
      placement="right" delay={{ show: 250, hide: 400 }}
      overlay={<Tooltip>Customers</Tooltip>}
    >
      <Button onClick={() => {
        navigate("/people");
      }
      } variant={buttonVariants['people']}><People/></Button>
    </OverlayTrigger>
    </div>
    <div>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>Documents</Tooltip>}
      >
        <Button onClick={() => {
          navigate("/documents");
        }} variant={buttonVariants['documents']}><ChatLeftQuote/></Button>
      </OverlayTrigger>
    </div>
    <div>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>Patterns</Tooltip>}
      >
        <Button onClick={() => {
          navigate("/");
        }} variant={buttonVariants['datasets']}><Intersect/></Button>
      </OverlayTrigger>
    </div>
    <div>
      <Button variant="link"><PieChart/></Button>
    </div>
    <div style={{flexGrow: "1", display: "flex", flexDirection: "column"}}>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>Settings</Tooltip>}
      >
        <Button variant="link" style={{marginTop: "auto"}}><GearWide/></Button>
      </OverlayTrigger>
    </div>
    <div>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>Log out</Tooltip>}
      >
        <Button onClick={props.logoutCallback} variant="link"><DoorOpen/></Button>
      </OverlayTrigger>
    </div>
  </div>;
}