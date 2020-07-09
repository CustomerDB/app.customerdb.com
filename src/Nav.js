import React from 'react';

import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { DoorOpen, People, ChatLeftQuote, GearWide, Intersect, House } from 'react-bootstrap-icons';

import { NavLink, Link, useLocation, useParams } from "react-router-dom";

import { logout } from './Utils.js';

export default function Nav(props) {

  let accountLinks = [
    {
      name: "Settings",
      path: "/settings",
      icon: <GearWide/>,
      end: false
    },
    {
      name: "Log out",
      path: "/logout",
      icon: <DoorOpen />,
      end: true
    }
  ];

  let orgLinks = [];

  let { orgID } = useParams();

  if (orgID) {
    orgLinks = [
      {
        name: "Home",
        path: `/orgs/${orgID}`,
        icon: <House />,
        end: true
      },
      {
        name: "People",
        path: `/orgs/${orgID}/people`,
        icon: <People />,
        end: false
      },
      {
        name: "Sources",
        path: `/orgs/${orgID}/sources`,
        icon: <ChatLeftQuote />,
        end: false
      },
      {
        name: "Explore",
        path: `/orgs/${orgID}/explore`,
        icon: <Intersect />,
        end: false
      }
    ];
  }

  const toNavLink = (target) => {
    return <div style={{marginTop: "1rem"}}>
      <OverlayTrigger
        placement="right" delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip>{target.name}</Tooltip>} >
        <NavLink to={target.path} className="btn" activeClassName="btn-primary" end={target.end}>
          {target.icon}
        </NavLink>
      </OverlayTrigger>
    </div>
  };

  let accountNavLinks = accountLinks.map(toNavLink);

  let orgNavLinks = orgLinks.map(toNavLink);

  return <div className="navLeft">
    <div style={{flexGrow: "1", display: "flex", flexDirection: "column"}}>

      {orgNavLinks}

      <div style={{marginTop: "auto"}}>
        { accountNavLinks }
      </div>
    </div>
  </div>;
}
