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
          textColor="secondary"
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
