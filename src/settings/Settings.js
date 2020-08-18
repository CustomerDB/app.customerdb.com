import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext";
import useFirestore from "../db/Firestore.js";

import Profile from "./Profile.js";
import Tags from "./Tags.js";
import Templates from "./Templates.js";
import Members from "./Members.js";
import BulkImport from "./BulkImport.js";

import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";

import Shell from "../shell/Shell.js";
import ListContainer from "../shell/ListContainer";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);
  const { orgID, tabID } = useParams();
  const navigate = useNavigate();

  const PROFILE = "profile";
  const TAGS = "tags";
  const TEMPLATES = "templates";
  const IMPORT = "import";
  const MEMBERS = "members";

  const tabs = [
    <Tab value={PROFILE} label="Profile" />,
    <Tab value={TAGS} label="Tags" />,
    <Tab value={TEMPLATES} label="Templates" />,
    <Tab value={IMPORT} label="Bulk Import" />,
  ];

  if (auth.oauthClaims.admin === true) {
    tabs.push(<Tab value={MEMBERS} label="Members" />);
  }

  const onTabChange = (e, newValue) => {
    console.log("tab clicked", e, newValue);
    navigate(`/orgs/${orgID}/settings/${newValue}`);
  };

  let currentTab = tabID || PROFILE;

  let content = undefined;

  if (currentTab === PROFILE) {
    content = <Profile />;
  }

  if (currentTab === TAGS) {
    content = (
      <Routes>
        <Route key="tags" path="/" element={<Tags />} />
        <Route key=":tagGroupID" path=":tagGroupID" element={<Tags />} />
      </Routes>
    );
  }

  if (currentTab === TEMPLATES) {
    content = (
      <Routes>
        <Route key="templates" path="/" element={<Templates />} />
        <Route key=":templateID" path=":templateID" element={<Templates />} />
      </Routes>
    );
  }

  if (currentTab === IMPORT) {
    content = <BulkImport />;
  }

  if (currentTab === MEMBERS) {
    content = <Members />;
  }

  if (!content) navigate("/404");

  return (
    <Shell title="Settings">
      <Grid container>
        <Grid container item xs={12}>
          <Paper style={{ width: "100%" }}>
            <Tabs value={currentTab} centered onChange={onTabChange}>
              {tabs}
            </Tabs>
          </Paper>
        </Grid>

        <Grid container item xs={12} style={{ marginTop: "1rem" }}>
          {content}
        </Grid>
      </Grid>
    </Shell>
  );
}
