import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { DoorOpen, PieChart, People, ChatLeftQuote, GearWide, Intersect, House } from 'react-bootstrap-icons';

import { useNavigate, useLocation } from "react-router-dom";

import { logout } from './Utils.js';

export default function LeftNav(props) {
  const location = useLocation();
  console.log(location);

  let pathParts = location.pathname.split("/");
  let orgID;
  let component = "home";
  if (pathParts.length > 2) {
    orgID = pathParts[2];
  }

  if (pathParts.length > 3) {
    component = pathParts[3];
  }

  let buttonVariants = {
    'home': 'link',
    'people': 'link',
    'sources': 'link',
    'explore': 'link'
  };
  buttonVariants[component] = 'primary';

  let navigate = useNavigate();

  return <div className="navLeft">
    <div>
    <OverlayTrigger
      placement="right" delay={{ show: 250, hide: 400 }}
      overlay={<Tooltip>Home</Tooltip>}
    >
      <Button onClick={() => {
        navigate(`/orgs/${orgID}/`);
      }
      } variant={buttonVariants['home']}><House/></Button>
    </OverlayTrigger>
    </div>
    <div>
    <OverlayTrigger
      placement="right" delay={{ show: 250, hide: 400 }}
      overlay={<Tooltip>Customers</Tooltip>}
    >
      <Button onClick={() => {
        navigate(`/orgs/${orgID}/people`);
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
          navigate(`/orgs/${orgID}/sources`);
        }} variant={buttonVariants['sources']}><ChatLeftQuote/></Button>
      </OverlayTrigger>
    </div>
    <div>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>Explore</Tooltip>}
      >
        <Button onClick={() => {
          navigate(`/orgs/${orgID}/explore`);
        }} variant={buttonVariants['explore']}><Intersect/></Button>
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
        <Button onClick={logout} variant="link"><DoorOpen/></Button>
      </OverlayTrigger>
    </div>
  </div>;
}