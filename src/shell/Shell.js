import "./style.css";

import React, { useState } from "react";
import { SearchDropdown } from "./Search.js";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import AssignmentIcon from "@material-ui/icons/Assignment";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import GroupIcon from "@material-ui/icons/Group";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import MenuIcon from "@material-ui/icons/Menu";
import SettingsIcon from "@material-ui/icons/Settings";
import Toolbar from "@material-ui/core/Toolbar";
import clsx from "clsx";
import logo from "../assets/images/logo.svg";
import logoDarkBG from "../assets/images/logo-dark-bg.svg";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { white } from "material-ui/styles/colors";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import Profile from "./Profile";
import Create from "./Create";
import CreateOrg from "./CreateOrg";

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
    background: "white",
    color: "#869AB8",
    borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
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
    background: "#1B2A4E",
    color: "#869AB8",
    padding: "1rem",
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: 0,
    padding: "1rem",
    [theme.breakpoints.up("xs")]: {
      padding: 0,
    },
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(11) + 1,
      padding: "1rem",
    },
    [theme.breakpoints.up("lg")]: {
      width: drawerWidth,
    },
    background: "#1B2A4E",
    color: "#869AB8",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    background: "#1B2A4E",
  },
  content: {
    flexGrow: 1,
    height: "calc(100vh - 64px)",
  },
  grow: {
    flexGrow: 1,
  },
  sideIcon: {
    color: "#869AB8",
  },
  sideIconSelected: {
    color: white,
  },
  listItem: {},
  listItemSelected: {
    background: "#121C32",
    color: "white",
    borderRadius: "0.5rem",
  },
}));

export default function Shell({
  search,
  children,
  noSidebar,
  noOrgSelector,
  ...otherProps
}) {
  const { orgID } = useParams();

  const [open, setOpen] = useState(false);

  const classes = useStyles();
  const theme = useTheme();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const lgBreakpoint = useMediaQuery(theme.breakpoints.up("lg"));

  let app = (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar
        position="fixed"
        className={clsx(classes.appBar, {
          [classes.appBarShift]: !noSidebar && (open || lgBreakpoint),
        })}
      >
        <Toolbar>
          {!noSidebar && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              className={clsx(classes.menuButton, {
                [classes.hide]: open || lgBreakpoint,
              })}
            >
              <MenuIcon />
            </IconButton>
          )}

          {noSidebar && (
            <img style={{ height: "2rem" }} src={logo} alt="CustomerDB" />
          )}

          <SearchDropdown />

          <div className={classes.grow} />

          {noSidebar ? <CreateOrg /> : <Create />}

          <Profile noOrgSelector={noOrgSelector} />
        </Toolbar>
      </AppBar>
      {!noSidebar && (
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
            <img style={{ width: "80%" }} src={logoDarkBG} alt="CustomerDB" />
            {!lgBreakpoint && (
              <IconButton onClick={handleDrawerClose}>
                {theme.direction === "rtl" ? (
                  <ChevronRightIcon />
                ) : (
                  <ChevronLeftIcon />
                )}
              </IconButton>
            )}
          </div>
          <Divider />
          <List>
            <NavListItem
              key="Interviews"
              to={[
                `/orgs/${orgID}/quotes`,
                `/orgs/${orgID}/interviews`,
                `/orgs/${orgID}/guides`,
              ]}
              icon={RecordVoiceOverIcon}
              label="Interviews"
            />
            <NavListItem
              key="Customers"
              to={[`/orgs/${orgID}/people`]}
              icon={GroupIcon}
              label="Customers"
            />
            <NavListItem
              key="Themes"
              to={[`/orgs/${orgID}/boards`]}
              icon={BubbleChartIcon}
              label="Themes"
            />
            <NavListItem
              key="Summaries"
              to={[`/orgs/${orgID}/summaries`]}
              icon={AssignmentIcon}
              label="Summaries"
            />
            <Divider />
            <NavListItem
              key="Tags"
              to={[`/orgs/${orgID}/tags`]}
              icon={LocalOfferIcon}
              label="Tags"
            />
          </List>
          <List>
            <NavListItem
              key="Settings"
              to={[`/orgs/${orgID}/settings`]}
              icon={SettingsIcon}
              label="Settings"
            />
          </List>
        </Drawer>
      )}
      <main className={classes.content}>
        <div className={classes.toolbar} />
        {children}
      </main>
    </div>
  );

  return app;
}

function NavListItem(props) {
  const classes = useStyles();

  const location = useLocation();
  const navigate = useNavigate();

  let selected = false;
  props.to.forEach((path) => {
    let pathSelected = props.end
      ? location.pathname === path
      : location.pathname.startsWith(path);

    if (pathSelected) {
      selected = true;
    }
  });

  let IconComponent = props.icon;

  return (
    <ListItem
      button
      className={selected ? classes.listItemSelected : classes.listItem}
      onClick={() => navigate(props.to[0])}
    >
      <ListItemIcon>
        <IconComponent
          className={selected ? classes.sideIconSelected : classes.sideIcon}
        />
      </ListItemIcon>
      <ListItemText primary={props.label} />
    </ListItem>
  );
}
