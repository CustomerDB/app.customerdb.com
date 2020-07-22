import React from "react";

import Shell from "./Shell.js";
import List from "./List.js";
import Page from "./Page.js";
import Tabs from "./Tabs.js";
import Content from "./Content.js";
import Options from "./Options.js";
import Scrollable from "./Scrollable.js";
import Navigation from "./Navigation.js";
import Modal from "./Modal.js";

import Button from "react-bootstrap/Button";

import { DoorOpen, GearWide, House, Mailbox } from "react-bootstrap-icons";

export default function ExampleApp(props) {
  let options = (ID) => (
    <Options>
      <Options.Item
        name="Edit"
        modal={
          <Modal
            name="Edit message"
            footer={[
              <Button
                onClick={() => {
                  console.log(`Edit ${ID}!`);
                }}
              >
                Edit
              </Button>,
            ]}
          >
            <p>Editing {ID}</p>
          </Modal>
        }
      />

      <Options.Item
        name="Delete"
        modal={
          <Modal
            name="Delete message"
            footer={[
              <Button
                onClick={() => {
                  console.log(`Delete ${ID}!`);
                }}
              >
                Delete
              </Button>,
            ]}
          >
            <p>Do you want to delete {ID}</p>
          </Modal>
        }
      />
    </Options>
  );

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
            path="//debug/shell/messages"
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
            <Scrollable>
              <List.Item
                name="Connor"
                path="/debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages//tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
              <List.Item
                name="Connor"
                path="//debug/shell/messages/connor"
                options={options(1)}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/messages/andrea"
                options={options(1)}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/messages/tobi"
                options={options(1)}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/messages/tim"
                options={options(1)}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/messages/arjun"
                options={options(1)}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/messages/brian"
                options={options(1)}
              />
            </Scrollable>
          </List.Items>
        </List>
        <Content>
          <Content.Title>
            <Content.Name>Messages</Content.Name>
          </Content.Title>
          <Tabs>
            <Tabs.Pane name="thread">
              <Tabs.Content>
                <Scrollable>
                  <div style={{ height: "1000rem" }}>{}</div>
                </Scrollable>
              </Tabs.Content>
              <Tabs.SidePane>
                <Tabs.SidePaneCard>
                  <small>Tags</small>
                  <p>Some tag</p>
                  <p>Another tag</p>
                </Tabs.SidePaneCard>
                <Tabs.SidePaneCard>
                  <small>Machine learning</small>
                  <p>Some tag</p>
                  <p>Another tag</p>
                </Tabs.SidePaneCard>
              </Tabs.SidePane>
            </Tabs.Pane>
            <Tabs.Pane name="details"></Tabs.Pane>
          </Tabs>
        </Content>
      </Page>
    </Shell>
  );
}
