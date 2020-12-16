import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import DeleteMemberDialog from "./DeleteMemberDialog.js";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import InviteMemberDialog from "./InviteMemberDialog.js";
import { Loading } from "../util/Utils.js";
import Options from "../shell/Options.js";
import Scrollable from "../shell/Scrollable.js";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import UserAuthContext from "../auth/UserAuthContext";
import event from "../analytics/event.js";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    minHeight: "24rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function Members(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { membersRef } = useFirestore();
  const [members, setMembers] = useState();
  const [member, setMember] = useState();
  const [inviteModalShow, setInviteModalShow] = useState();
  const [deleteModalShow, setDeleteModalShow] = useState();

  const classes = useStyles();

  useEffect(() => {
    if (!membersRef) {
      return;
    }

    let unsubscribe = membersRef.onSnapshot((query) => {
      let members = [];
      query.forEach((doc) => {
        let data = doc.data();
        data.ID = doc.id;
        members.push(data);
      });

      setMembers(members);
    });
    return unsubscribe;
  }, [membersRef]);

  const onInvite = (email) => {
    event(firebase, "invite_member", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    let lowerCaseEmail = email.toLowerCase();

    membersRef.doc(lowerCaseEmail).set({
      invited: true,
      active: false,
      email: lowerCaseEmail,
      inviteSentTimestamp: "",
    });
  };

  const onDelete = (email) => {
    membersRef.doc(email).delete();
  };

  const onActivate = (email) => {
    membersRef.doc(email).update({ active: true });
  };
  const onDisable = (email) => {
    membersRef.doc(email).update({ active: false });
  };
  const onUserToAdmin = (email) => {
    membersRef.doc(email).update({ admin: true });
  };
  const onAdminToUser = (email) => {
    membersRef.doc(email).update({ admin: false });
  };

  const createData = (member) => {
    let options = [];

    let status;

    if (member.invited) {
      status = "Invited";
    } else if (!member.active) {
      status = "Inactive";
      options.push({
        name: "Activate",
        onClick: (item) => {
          onActivate(item.ID);
        },
      });
    } else if (member.admin) {
      status = "Administrator";

      options.push({
        name: "Disable account",
        onClick: (item) => {
          onDisable(item.ID);
        },
      });

      options.push({
        name: "Convert to member",
        onClick: (item) => {
          onAdminToUser(item.ID);
        },
      });
    } else {
      status = "Active";

      options.push({
        name: "Disable account",
        onClick: (item) => {
          onDisable(item.ID);
        },
      });

      options.push({
        name: "Convert to administrator",
        onClick: (item) => {
          onUserToAdmin(item.ID);
        },
      });
    }

    options.push({
      name: "Delete",
      onClick: (item) => {
        setMember(item);
        setDeleteModalShow(true);
      },
    });

    let avatar =
      member.photoURL !== undefined ? (
        <Avatar
          src={member.photoURL}
          alt=""
          style={{ width: "4rem", height: "4rem" }}
        />
      ) : (
        <></>
      );

    return {
      ID: member.ID,
      avatar: avatar,
      name: member.displayName,
      email: member.email,
      status: status,
      options: <Options options={options} item={member} />,
    };
  };

  if (!members) {
    return <Loading />;
  }

  const rows = members.map(createData);

  let memberTable = (
    <Table
      style={{ width: "100%", overflowX: "hidden" }}
      aria-label="organization members"
    >
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ID}>
            <TableCell align="left">{row.avatar}</TableCell>
            <TableCell component="th" scope="row">
              {row.name}
            </TableCell>
            <TableCell align="left">{row.email}</TableCell>
            <TableCell align="left">{row.status}</TableCell>
            <TableCell align="left">{row.options}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Grid
      container
      item
      xs={12}
      spacing={0}
      justify="center"
      style={{ position: "relative" }}
    >
      <Card className={classes.fullWidthCard}>
        <CardContent>
          <Grid item xs>
            {memberTable}
          </Grid>
        </CardContent>
        <CardActions>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setInviteModalShow(true);
            }}
          >
            Invite member
          </Button>
        </CardActions>
      </Card>
      <InviteMemberDialog
        show={inviteModalShow}
        onInvite={onInvite}
        onHide={() => {
          setInviteModalShow(false);
        }}
      />
      <DeleteMemberDialog
        show={deleteModalShow}
        member={member}
        onDelete={onDelete}
        onHide={() => {
          setDeleteModalShow(false);
        }}
      />
    </Grid>
  );
}
