// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
          textColor="secondary"
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
