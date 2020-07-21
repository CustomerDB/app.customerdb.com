import React from "react";

import Shell from "./Shell.js";
import List from "./List.js";
import Page from "./Page.js";
import Tabs from "./Tabs.js";
import Content from "./Content.js";
import Options from "./Options.js";
import Scrollable from "./Scrollable.js";
import Navigation from "./Navigation.js";

import { DoorOpen, GearWide, House, Mailbox } from "react-bootstrap-icons";

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
            <Scrollable>
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
              />
              <List.Item
                name="Connor"
                path="/debug/shell/connor"
                options={<Options />}
              />
              <List.Item
                name="Andrea"
                path="/debug/shell/andrea"
                options={<Options />}
              />
              <List.Item
                name="Tobi"
                path="/debug/shell/tobi"
                options={<Options />}
              />
              <List.Item
                name="Tim"
                path="/debug/shell/tim"
                options={<Options />}
              />
              <List.Item
                name="Arjun"
                path="/debug/shell/arjun"
                options={<Options />}
              />
              <List.Item
                name="Brian"
                path="/debug/shell/brian"
                options={<Options />}
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
              <Tabs.SidePane></Tabs.SidePane>
            </Tabs.Pane>
            <Tabs.Pane name="details"></Tabs.Pane>
          </Tabs>
        </Content>
      </Page>
    </Shell>
  );
}
