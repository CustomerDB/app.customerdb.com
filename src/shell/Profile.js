import React, { useContext, useState } from "react";
import Popper from "@material-ui/core/Popper";
import UserAuthContext from "../auth/UserAuthContext.js";
import Tooltip from "@material-ui/core/Tooltip";
import Card from "@material-ui/core/Card";
import Grid from "@material-ui/core/Grid";
import OrgSelector from "../orgs/OrgSelector.js";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import { useNavigate, useParams } from "react-router-dom";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Divider from "@material-ui/core/Divider";
import SettingsIcon from "@material-ui/icons/Settings";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";

export default function Profile({ noOrgSelector }) {
  const { oauthUser } = useContext(UserAuthContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { orgID } = useParams();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {oauthUser && (
        <>
          <IconButton
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            aria-controls="profile-menu"
            onClick={handleClick}
            color="inherit"
          >
            <Avatar
              key={oauthUser.email}
              alt={oauthUser.displayName}
              src={oauthUser.photoURL}
            />
          </IconButton>
          <Popper open={Boolean(anchorEl)} anchorEl={anchorEl}>
            <ClickAwayListener onClickAway={handleClose}>
              <Card
                elevation={3}
                style={{
                  width: "20rem",
                  paddingTop: "2rem",
                }}
              >
                <Grid container>
                  <Grid container item xs={12} justify="center">
                    <Avatar
                      key={oauthUser.email}
                      alt={oauthUser.displayName}
                      src={oauthUser.photoURL}
                      style={{ width: "6rem", height: "6rem" }}
                    />
                  </Grid>
                  <Grid container item xs={12} justify="center">
                    <Typography variant="h6" gutterBottom>
                      {oauthUser.displayName}
                    </Typography>
                  </Grid>
                  <Grid container item xs={12} justify="center">
                    <Typography variant="subtitle1" gutterBottom>
                      {oauthUser.email}
                    </Typography>
                  </Grid>
                  <Grid container item xs={12} justify="center">
                    {orgID && (
                      <Tooltip title="Profile settings">
                        <IconButton
                          onClick={() => {
                            setAnchorEl(null);
                            navigate(`/orgs/${orgID}/settings/profile`);
                          }}
                        >
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Logout">
                      <IconButton
                        onClick={() => {
                          setAnchorEl(null);
                          navigate(`/logout`);
                        }}
                      >
                        <ExitToAppIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
                <Divider />
                {!noOrgSelector && <OrgSelector />}
              </Card>
            </ClickAwayListener>
          </Popper>
        </>
      )}
    </>
  );
}
