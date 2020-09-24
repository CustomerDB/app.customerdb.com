import "./style.css";

import React, { useContext, useState } from "react";
import { Search, SearchInput } from "./Search.js";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import AppBar from "@material-ui/core/AppBar";
import Avatar from "@material-ui/core/Avatar";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import ExploreIcon from "@material-ui/icons/Explore";
import GroupIcon from "@material-ui/icons/Group";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Menu from "@material-ui/core/Menu";
import MenuIcon from "@material-ui/icons/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MultilineChartIcon from "@material-ui/icons/MultilineChart";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import SettingsIcon from "@material-ui/icons/Settings";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import clsx from "clsx";
import logo from "../assets/images/logo.svg";
import logoDarkBG from "../assets/images/logo-dark-bg.svg";
import useMediaQuery from "@material-ui/core/useMediaQuery";

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
    width: 0,
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9) + 1,
    },
    [theme.breakpoints.up("lg")]: {
      width: drawerWidth,
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    [theme.breakpoints.up("lg")]: {
      backgroundColor: "#1b2a4e",
    },
  },
  content: {
    flexGrow: 1,
    height: "calc(100vh - 64px)",
  },
  grow: {
    flexGrow: 1,
  },
}));

export default function Shell(props) {
  const { oauthUser } = useContext(UserAuthContext);

  const { orgID } = useParams();

  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const classes = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const lgBreakpoint = useMediaQuery(theme.breakpoints.up("lg"));

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  let app = (
    <Search search={props.search}>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar
          position="fixed"
          className={clsx(classes.appBar, {
            [classes.appBarShift]: open || lgBreakpoint,
          })}
        >
          <Toolbar>
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
            {!lgBreakpoint && (
              <Typography variant="h6" noWrap>
                {props.title}
              </Typography>
            )}
            {props.search && <SearchInput />}
            <div className={classes.grow} />
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
                <Menu
                  id="profile-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      navigate(`/orgs/${orgID}/settings/profile`);
                    }}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      navigate(`/logout`);
                    }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
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
            <img
              style={{ width: "80%" }}
              src={lgBreakpoint ? logoDarkBG : logo}
              alt="CustomerDB product logo"
            />
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
            <NavListItem key="Interviews" to={`/orgs/${orgID}/interviews`}>
              <ListItemIcon>
                <RecordVoiceOverIcon />
              </ListItemIcon>
              <ListItemText primary="Interviews" />
            </NavListItem>
            <NavListItem key="Guides" to={`/orgs/${orgID}/guides`}>
              <ListItemIcon>
                <ExploreIcon />
              </ListItemIcon>
              <ListItemText primary="Guides" />
            </NavListItem>
            <NavListItem key="Customers" to={`/orgs/${orgID}/people`}>
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary="Customers" />
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
          </List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          {props.children}
        </main>
      </div>
    </Search>
  );

  return app;
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
