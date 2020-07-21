import React from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import "./style.css";

import { DoorOpen, GearWide, House, Mailbox } from "react-bootstrap-icons";

import { NavLink } from "react-router-dom";

export function Shell(props) {
  return (
    <Container className="Shell h-100 p-0" fluid>
      <Row noGutters={true} className="h-100">
        {props.children}
      </Row>
    </Container>
  );
}

export class Navigation extends React.Component {
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

export class List extends React.Component {
  constructor(props) {
    super(props);
  }

  static Search(props) {
    return <></>;
  }

  static Title(props) {
    return <Row className="mb-3">{props.children}</Row>;
  }

  static Name(props) {
    return (
      <Col md={10}>
        <h3>{props.children}</h3>
      </Col>
    );
  }

  static Add(props) {
    return (
      <Col md={2}>
        <Button className="Add">+</Button>
      </Col>
    );
  }

  static Items(props) {
    return (
      <Row className="h-100 w-100" noGutters={true}>
        <Col>
          <div className="scrollContainer">
            <div className="scroll listShadow">{props.children}</div>
          </div>
        </Col>
      </Row>
    );
  }

  static Item(props) {
    return (
      <Row noGutters={true} className="mb-3">
        <Col className="ListItem">
          <Row noGutters={true} className="h-100 p-3">
            <Col className="align-self-center">
              <p className="ListItemName">{props.name}</p>
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }

  render() {
    return (
      <Col md={3} className="p-4">
        {this.props.children}
      </Col>
    );
  }
}

export class Content extends React.Component {
  static Title(props) {
    return <>{props.children}</>;
  }

  static Name(props) {
    return <h3>{props.children}</h3>;
  }

  render() {
    return (
      <Col md={8} className="p-4">
        {this.props.children}
      </Col>
    );
  }
}

export function Options(props) {
  return <></>;
}

export function Scrollable(props) {
  return <></>;
}

export function Tabs(props) {
  return <></>;
}

export function Pane(props) {
  return <></>;
}

export function Suggestions(props) {
  return <></>;
}

export function Card(props) {
  return <></>;
}

export function Page(props) {
  return <>{props.children}</>;
}

export default function ExampleApp(props) {
  return (
    <Shell>
      <Navigation>
        <Navigation.Top>
          <Navigation.Item
            name="Home"
            icon={<House />}
            path="/debug/shell/"
            end={true}
          />
          <Navigation.Item
            name="Messages"
            icon={<Mailbox />}
            path="/debug/shell/messages"
            end={false}
          />
        </Navigation.Top>
        <Navigation.Bottom>
          <Navigation.Item
            name="Settings"
            icon={<GearWide />}
            path="/debug/shell/settings"
            end={false}
          />
          <Navigation.Item
            name="Logout"
            icon={<DoorOpen />}
            path="/debug/shell/logout"
            end={true}
          />
        </Navigation.Bottom>
      </Navigation>

      <Page>
        <List>
          <List.Search placeholder="Search in documents..." />
          <List.Title>
            <List.Name>Messages</List.Name>
            <List.Add />
          </List.Title>
          <List.Items>
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
            <List.Item name="Connor" path="" />
            <List.Item name="Andrea" path="" />
            <List.Item name="Tobi" path="" />
            <List.Item name="Tim" path="" />
            <List.Item name="Arjun" path="" />
            <List.Item name="Brian" path="" />
          </List.Items>
        </List>
      </Page>
      <Content>
        <Content.Title>
          <Content.Name>Messages</Content.Name>
        </Content.Title>
      </Content>
    </Shell>
  );
}

// {/*
//     <Content>
//       <Content.Title>
//         <Content.Name></Content.Name>
//         <Options />
//       </Content.Title>
//       <Tabs>
//         <Tabs.Pane>
//           <Scrollable>
//             {/* Long scrollable pane */}
//             </Scrollable>
//             <Suggestions>
//               <Card>

//               </Card>
//               <Card>

//               </Card>
//             </Suggestions>
//           </Tabs.Pane>
//           <Tabs.Pane>
//             <Scrollable>

//             </Scrollable>
//           </Tabs.Pane>
//         </Tabs>
//       </Content> */}
