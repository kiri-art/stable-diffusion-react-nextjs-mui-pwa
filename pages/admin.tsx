import React from "react";
import { t, Trans } from "@lingui/macro";
import {
  db,
  useGongoUserId,
  useGongoOne,
  useGongoSub,
  useGongoLive,
} from "gongo-client-react";

import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Credits() {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  useGongoSub("usersAndCredits", {});
  const users = useGongoLive((db) => db.collection("users").find());

  function onClick(userId: string, field: string, oldValue: number) {
    return function () {
      const textValue = prompt("New Value?  Was: " + oldValue);
      if (!textValue) return alert("Invalid value");
      const newValue = parseInt(textValue);
      const query = { $set: { [field]: newValue } };
      db.collection("users").update(userId, query);
    };
  }

  if (!(user && user.admin))
    return (
      <div>
        <Trans>Access Denied.</Trans>
      </div>
    );

  return (
    <>
      <MyAppBar title={t`Admin`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <p>Users and Credits</p>

        <p>Total users: {users.length}</p>

        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Free</TableCell>
                <TableCell align="right">Paid</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user._id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {user.displayName}
                    <br />
                    {user.emails[0].value}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={onClick(
                      user._id,
                      "credits.free",
                      user.credits.free
                    )}
                  >
                    {user.credits.free}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={onClick(
                      user._id,
                      "credits.paid",
                      user.credits.paid
                    )}
                  >
                    {user.credits.paid}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}
