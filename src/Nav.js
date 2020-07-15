import React from 'react';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { DoorOpen, People, ChatLeftQuote, GearWide, Intersect, House } from 'react-bootstrap-icons';

import { NavLink, useParams } from "react-router-dom";

export default function Nav(props) {
  let { orgID } = useParams();

  let accountLinks = [
    {
      name: "Settings",
      path: `/orgs/${orgID}/settings`,
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
        name: "Customer Data",
        path: `/orgs/${orgID}/data`,
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
    return <div style={{marginTop: "1rem"}} key={target.path}>
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
