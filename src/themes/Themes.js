import React, { useEffect, useState } from "react";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Scrollable from "../shell/Scrollable.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function Themes({ children }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { orgID } = useParams();

  useEffect(() => {
    if (!location) return;

    if (location.pathname.startsWith(`/orgs/${orgID}/themes`)) {
      setSelectedTab(0);
    }

    if (location.pathname.startsWith(`/orgs/${orgID}/boards`)) {
      setSelectedTab(1);
    }
  }, [location, orgID]);

  return (
    <div
      className="fullHeight"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div>
        <Tabs
          value={selectedTab}
          indicatorColor="secondary"
          textColor="primary"
          aria-label="full width"
          style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.12)" }}
        >
          <Tab
            label="Themes"
            id="themes"
            aria-controls="tabpanel-themes"
            onClick={() => {
              navigate(`/orgs/${orgID}/themes`);
            }}
          />
          <Tab
            label="Boards"
            id="boards"
            aria-controls="tabpanel-boards"
            onClick={() => {
              navigate(`/orgs/${orgID}/boards`);
            }}
          />
        </Tabs>
      </div>
      <div style={{ position: "relative", flexGrow: 1 }}>
        <Scrollable>{children}</Scrollable>
      </div>
    </div>
  );
}
