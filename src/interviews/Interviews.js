import React, { useEffect, useState } from "react";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Scrollable from "../shell/Scrollable.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function Interviews({ children }) {
  const [selectedTab, setSelectedTab] = useState();

  const location = useLocation();
  const navigate = useNavigate();
  const { orgID } = useParams();

  useEffect(() => {
    if (location.pathname.startsWith(`/orgs/${orgID}/quotes`)) {
      setSelectedTab(0);
    }

    if (location.pathname.startsWith(`/orgs/${orgID}/interviews`)) {
      setSelectedTab(1);
    }

    if (location.pathname.startsWith(`/orgs/${orgID}/guides`)) {
      setSelectedTab(2);
    }
  }, [location, orgID]);

  return (
    <div
      class="fullHeight"
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
            label="Quotes"
            id="quotes"
            aria-controls="tabpanel-quotes"
            onClick={() => {
              navigate(`/orgs/${orgID}/quotes`);
            }}
          />
          <Tab
            label="Interviews"
            id="interviews"
            aria-controls="tabpanel-interviews"
            onClick={() => {
              navigate(`/orgs/${orgID}/interviews`);
            }}
          />
          <Tab
            label="Guides"
            id="guides"
            aria-controls="tabpanel-guides"
            onClick={() => {
              navigate(`/orgs/${orgID}/guides`);
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
