import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import React from "react";
import Themes from "../themes/Themes.js";
import Boards from "../themes/Boards.js";
import ThemeList from "../themes/Boards.js";
import Guides from "../guides/Guides.js";
import InterviewList from "../interviews/InterviewList.js";
import Interviews from "../interviews/Interviews.js";
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
          <Route path=":personID/:tabID" element={<People />} />
        </Route>

        <Interviews>
          <Route path="interviews/*">
            <Route path="/" element={<InterviewList />} />
            <Route path="create" element={<InterviewList create />} />
            <Route path="guide" element={<InterviewList create fromGuide />} />
            <Route path=":documentID" element={<InterviewList />} />
            <Route path=":documentID/:tabID" element={<InterviewList />} />
          </Route>
        </Interviews>

        <Interviews>
          <Route path="quotes/*">
            <Route path="/" element={<Quotes />} />
          </Route>
        </Interviews>

        <Interviews>
          <Route path="guides/*">
            <Route path="/" element={<Guides />} />
            <Route path="create" element={<Guides create />} />
            <Route path=":guideID" element={<Guides />} />
          </Route>
        </Interviews>

        <Themes>
          <Route path="boards/*">
            <Route path="/" element={<Boards />} />
            <Route path="create" element={<Boards create />} />
            <Route path=":boardID" element={<Boards />} />
            <Route path=":boardID/download" element={<Boards download />} />
          </Route>
        </Themes>

        <Themes>
          <Route path="themes/*">
            <Route path="/" element={<ThemeList />} />
          </Route>
        </Themes>

        <Route path="summaries/*">
          <Route path="/" element={<Summaries />} />
          <Route path="create" element={<Summaries create />} />
          <Route path=":summaryID" element={<Summary />} />
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
