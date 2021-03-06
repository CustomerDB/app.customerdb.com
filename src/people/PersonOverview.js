// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";

import Grid from "@material-ui/core/Grid";
import Avatar from "react-avatar";
import Table from "@material-ui/core/Table";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import ApartmentIcon from "@material-ui/icons/Apartment";
import EmailIcon from "@material-ui/icons/Email";
import PhoneIcon from "@material-ui/icons/Phone";
import RoomIcon from "@material-ui/icons/Room";
import WorkIcon from "@material-ui/icons/Work";
import Typography from "@material-ui/core/Typography";
import Linkify from "react-linkify";

export default function PersonOverview({ person }) {
  if (!person) {
    return <></>;
  }

  const address = [person.city, person.state, person.country]
    .flatMap((item) => (item ? [item] : []))
    .join(", ");

  return (
    <Grid container item xs={12} md={3} lg={3} style={{ padding: "1rem" }}>
      <Grid container direction="column">
        <Grid
          container
          item
          style={{
            marginBottom: "2rem",
            padding: "2rem",
            background: "white",
          }}
          justify="center"
        >
          <Grid container item justify="center">
            <Grid icontainer item xs={12} style={{ textAlign: "center" }}>
              <Avatar
                size={150}
                name={person.name}
                src={person.imageURL}
                round={true}
                style={{ marginBottom: "1rem" }}
              />
            </Grid>
            <Grid container item xs={12} justify="center">
              <Typography
                variant="h6"
                style={{ fontWeight: "bold" }}
                gutterBottom
              >
                {person.name}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        {(person.job ||
          person.company ||
          person.email ||
          person.phone ||
          person.city ||
          person.state ||
          person.country ||
          person.customFields) && (
          <Grid
            container
            item
            style={{
              marginBottom: "2rem",
              padding: "2rem",
              background: "white",
            }}
            justify="center"
          >
            <Table>
              <TableBody>
                {person.job && (
                  <TableRow>
                    <TableCell style={{ width: "3rem" }}>
                      <WorkIcon />
                    </TableCell>
                    <TableCell>{person.job}</TableCell>
                  </TableRow>
                )}
                {person.company && (
                  <TableRow>
                    <TableCell style={{ width: "3rem" }}>
                      <ApartmentIcon />
                    </TableCell>
                    <TableCell>{person.company}</TableCell>
                  </TableRow>
                )}
                {person.email && (
                  <TableRow>
                    <TableCell style={{ width: "3rem" }}>
                      <EmailIcon />
                    </TableCell>
                    <TableCell>
                      <Linkify>{person.email}</Linkify>
                    </TableCell>
                  </TableRow>
                )}
                {person.phone && (
                  <TableRow>
                    <TableCell style={{ width: "3rem" }}>
                      <PhoneIcon />
                    </TableCell>
                    <TableCell>{person.phone}</TableCell>
                  </TableRow>
                )}
                {address && (
                  <TableRow>
                    <TableCell style={{ width: "3rem" }}>
                      <RoomIcon />
                    </TableCell>
                    <TableCell>{address}</TableCell>
                  </TableRow>
                )}
                {person.customFields &&
                  Object.values(person.customFields).map((field) => (
                    <TableRow>
                      <TableCell style={{ width: "3rem" }}>
                        {field.kind}
                      </TableCell>
                      <TableCell
                        style={{
                          maxWidth: "6rem",
                          overflowWrap: "break-word",
                          wordWrap: "break-word",
                        }}
                      >
                        <Linkify>{field.value}</Linkify>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
