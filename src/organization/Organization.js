import React from "react";
import { useContext, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

import { useNavigate, useLocation, useParams, NavLink } from "react-router-dom";

import { Loading } from "../util/Utils.js";

import OrganizationRoutes from "./OrganizationRoutes.js";

import clsx from "clsx";
import {
  makeStyles,
  useTheme,
  ThemeProvider,
  createMuiTheme,
} from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import CssBaseline from "@material-ui/core/CssBaseline";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

// Drawer icons
import GroupIcon from "@material-ui/icons/Group";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import MultilineChartIcon from "@material-ui/icons/MultilineChart";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import SettingsIcon from "@material-ui/icons/Settings";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: "none",
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: theme.spacing(7) + 1,
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9) + 1,
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    height: "calc(100vh - 64px)",
  },
}));

export default function Organization() {
  const { oauthUser, oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();

  const navigate = useNavigate();
  const location = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [intercomInit, setIntercomInit] = useState(false);
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    if (!oauthUser) {
      navigate("/logout");
      setAuthorized(false);
      return;
    }

    if (oauthClaims) {
      if (!oauthClaims.orgID || oauthClaims.orgID !== orgID) {
        console.debug("user not authorized");
        navigate("/logout");
        setAuthorized(false);
        return;
      }

      if (oauthClaims.orgID === orgID) {
        setAuthorized(true);
      }
    }
  }, [navigate, orgID, oauthUser, oauthClaims]);

  // Initialize intercom on load
  useEffect(() => {
    if (!authorized || !oauthClaims) return;
    let intercomConfig = Object.assign({ app_id: "xdjuo7oo" }, oauthClaims);
    window.Intercom("boot", intercomConfig);
    setIntercomInit(true);
  }, [authorized, oauthClaims]);

  // Update intercom whenever the URL changes
  useEffect(() => {
    if (!intercomInit) return;
    window.Intercom("update");
  }, [intercomInit, location]);

  const classes = useStyles();
  const theme = useTheme();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  if (!authorized) return <Loading />;

  //   let customTheme = {};
  // Object.assign({}, theme);
  //   customTheme.palette.primary1Color =
  //   customTheme.palette.accent1Color = ;

  const customTheme = createMuiTheme({
    palette: {
      primary: {
        main: "#424242",
      },
      secondary: {
        main: "#ff5252",
      },
    },
  });

  return (
    <ThemeProvider theme={customTheme}>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar
          position="fixed"
          className={clsx(classes.appBar, {
            [classes.appBarShift]: open,
          })}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              className={clsx(classes.menuButton, {
                [classes.hide]: open,
              })}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              CustomerDB
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          className={clsx(classes.drawer, {
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          })}
          classes={{
            paper: clsx({
              [classes.drawerOpen]: open,
              [classes.drawerClose]: !open,
            }),
          }}
        >
          <div className={classes.toolbar}>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </div>
          <Divider />
          <List>
            <NavListItem key="Customers" to={`/orgs/${orgID}/people`}>
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary="Customers" />
            </NavListItem>
            <NavListItem key="Data" to={`/orgs/${orgID}/data`}>
              <ListItemIcon>
                <RecordVoiceOverIcon />
              </ListItemIcon>
              <ListItemText primary="Data" />
            </NavListItem>
            <NavListItem key="Analysis" to={`/orgs/${orgID}/analyze`}>
              <ListItemIcon>
                <MultilineChartIcon />
              </ListItemIcon>
              <ListItemText primary="Analysis" />
            </NavListItem>
          </List>

          <Divider />

          <List>
            <NavListItem key="Settings" to={`/orgs/${orgID}/settings`}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </NavListItem>
            <NavListItem key="Logout" to={`/logout`}>
              <ListItemIcon>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText primary="Log out" />
            </NavListItem>
          </List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          <OrganizationRoutes />
        </main>
      </div>
    </ThemeProvider>
  );
}

function NavListItem(props) {
  const location = useLocation();
  const navigate = useNavigate();

  let selected = props.end
    ? location.pathname === props.to
    : location.pathname.startsWith(props.to);

  return (
    <ListItem button selected={selected} onClick={() => navigate(props.to)}>
      {props.children}
    </ListItem>
  );
}
