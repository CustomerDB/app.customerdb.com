import React, { useContext } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";

import BulkImport from "./BulkImport.js";
import Grid from "@material-ui/core/Grid";
import Members from "./Members.js";
import Paper from "@material-ui/core/Paper";
import Profile from "./Profile.js";
import Shell from "../shell/Shell.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Tags from "./Tags.js";
import UserAuthContext from "../auth/UserAuthContext";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);
  const { orgID, tabID } = useParams();
  const navigate = useNavigate();

  const PROFILE = "profile";
  const TAGS = "tags";
  const IMPORT = "import";
  const MEMBERS = "members";

  const tabs = [
    <Tab key={PROFILE} value={PROFILE} label="Profile" />,
    <Tab key={TAGS} value={TAGS} label="Tags" />,
    <Tab key={IMPORT} value={IMPORT} label="Bulk Import" />,
  ];

  if (auth.oauthClaims.orgs[orgID].admin === true) {
    tabs.push(<Tab key={MEMBERS} value={MEMBERS} label="Members" />);
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

  if (currentTab === IMPORT) {
    content = <BulkImport />;
  }

  if (currentTab === MEMBERS) {
    content = <Members />;
  }

  if (!content) navigate("/404");

  return (
    <Shell>
      <Grid
        container
        direction="column"
        justify="flex-start"
        alignItems="flex-start"
        style={{ height: "100%" }}
      >
        <Grid container item style={{ height: "3rem" }} alignItems="flex-start">
          <Paper style={{ width: "100%", height: "3rem" }} elevation={0}>
            <Tabs value={currentTab} centered onChange={onTabChange}>
              {tabs}
            </Tabs>
          </Paper>
        </Grid>

        <Grid container item xs style={{ width: "100%" }}>
          {content}
        </Grid>
      </Grid>
    </Shell>
  );
}
