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

import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import React from "react";
import Boards from "../themes/Boards.js";
import ThemeList from "../themes/ThemeList.js";
import Guides from "../guides/Guides.js";
import InterviewList from "../interviews/InterviewList.js";
import People from "../people/People.js";
import Quotes from "../quotes/Quotes.js";
import Summaries from "../summaries/Summaries.js";
import Summary from "../summaries/Summary.js";
import Settings from "../settings/Settings.js";
import Tags from "../tags/Tags.js";
import Shell from "../shell/Shell.js";

export default function OrganizationRoutes(props) {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="quotes" />} />

        <Route path="people/*">
          <Route path="/" element={<People />} />
          <Route path=":personID" element={<People />} />
          <Route path="create" element={<People create />} />
          <Route path=":personID/edit" element={<People edit />} />
          <Route path=":personID/:tabID" element={<People />} />
        </Route>

        <Route path="interviews/*">
          <Route path="/" element={<InterviewList />} />
          <Route path="create" element={<InterviewList create />} />
          <Route path="guide" element={<InterviewList create fromGuide />} />
          <Route path=":documentID" element={<Navigate to="transcript" />} />
          <Route path=":documentID/:tabID" element={<InterviewList />} />
        </Route>

        <Route path="quotes/*">
          <Route path="/" element={<Quotes />} />
        </Route>

        <Route path="guides/*">
          <Route path="/" element={<Guides />} />
          <Route path="create" element={<Guides create />} />
          <Route path=":guideID" element={<Guides />} />
        </Route>

        <Route path="boards/*">
          <Route path="/" element={<Boards />} />
          <Route path="create" element={<Boards create />} />
          <Route path=":boardID" element={<Boards />} />
          <Route path=":boardID/download" element={<Boards download />} />
        </Route>

        <Route path="themes/*">
          <Route path="/" element={<ThemeList />} />
        </Route>

        <Route path="summaries/*">
          <Route path="/" element={<Summaries />} />
          <Route path="create" element={<Summaries create />} />
          <Route path=":summaryID" element={<Summary />} />
        </Route>

        <Route path="tags/*">
          <Route path="/" element={<Tags />} />
          <Route path="create" element={<Tags create />} />
        </Route>

        <Route path="settings/*">
          <Route path="/" element={<Settings />} />
          <Route path=":tabID/*" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
      <Outlet />
    </Shell>
  );
}
