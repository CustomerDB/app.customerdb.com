import React from "react";

import { NavLink } from "react-router-dom";

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
  }

  static Item(props) {
    return (
      <div>
        <NavLink
          to={props.path}
          className="btn"
          activeClassName="btn-primary"
          end={props.end}
        >
          {props.icon}
        </NavLink>
      </div>
    );
  }

  static Top(props) {
    return (
      <div className="NavigationTop d-flex flex-column flex-grow-1">
        {props.children}
      </div>
    );
  }

  static Bottom(props) {
    return (
      <div className="NavigationBottom d-flex flex-column">
        {props.children}
      </div>
    );
  }

  render() {
    return (
      <div className="Navigation d-flex flex-column h-100">
        {this.props.children}
      </div>
    );
  }
}
