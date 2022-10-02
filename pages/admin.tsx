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
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import { creditCodeSchema } from "../src/schemas";

function Credits() {
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

  return (
    <Box>
      <Typography variant="h6">Users and Credits</Typography>

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
                  {user.emails[0]?.value}
                </TableCell>
                <TableCell
                  align="right"
                  style={{ cursor: "pointer" }}
                  onClick={onClick(user._id, "credits.free", user.credits.free)}
                >
                  {user.credits.free}
                </TableCell>
                <TableCell
                  align="right"
                  style={{ cursor: "pointer" }}
                  onClick={onClick(user._id, "credits.paid", user.credits.paid)}
                >
                  {user.credits.paid}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function Codes() {
  const [newCodeName, setNewCodeName] = React.useState("");
  const [newCodeCredits, setNewCodeCredits] = React.useState("");
  const [newCodeTotal, setNewCodeTotal] = React.useState("");
  const creditCodes = useGongoLive((db) => db.collection("creditCodes").find());
  useGongoSub("allCreditCodes", {});

  function addNewCode(event: React.SyntheticEvent) {
    event.preventDefault();

    const entry = creditCodeSchema.cast({
      name: newCodeName,
      credits: newCodeCredits,
      total: newCodeTotal,
    });

    db.collection("creditCodes").insert(entry);
    setNewCodeName("");
  }

  function onClick(
    codeId: string,
    field: "name" | "credits" | "total",
    oldValue: string | number
  ) {
    return function () {
      const textValue = prompt("New Value?  Was: " + oldValue);
      if (!textValue) return;
      let newValue;
      try {
        // @ts-expect-error: not sure why, seems to work `:)
        newValue = creditCodeSchema.fields[field].cast(textValue);
      } catch (error) {
        let message = "Failed";
        if (error instanceof Error) message = error.message;
        alert(message);
        return;
      }
      const query = { $set: { [field]: newValue } };
      db.collection("creditCodes").update(codeId, query);
    };
  }

  return (
    <Box>
      <Typography variant="h6">Codes</Typography>
      <br />
      <form onSubmit={addNewCode}>
        <TextField
          size="small"
          label="Code"
          value={newCodeName}
          onChange={(event) => setNewCodeName(event.target.value)}
        />{" "}
        <TextField
          size="small"
          label="Credits"
          value={newCodeCredits}
          onChange={(event) => setNewCodeCredits(event.target.value)}
        />{" "}
        <TextField
          size="small"
          label="Total"
          value={newCodeTotal}
          onChange={(event) => setNewCodeTotal(event.target.value)}
        />{" "}
        <Button type="submit" variant="outlined">
          Add New
        </Button>
      </form>
      <br />
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Credits</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {creditCodes.map((code) => (
              <TableRow
                key={code._id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {code.name}
                </TableCell>
                <TableCell
                  align="right"
                  style={{ cursor: "pointer" }}
                  onClick={onClick(code._id, "credits", code.total)}
                >
                  {code.credits}
                </TableCell>
                <TableCell
                  align="right"
                  style={{ cursor: "pointer" }}
                  onClick={onClick(code._id, "total", code.total)}
                >
                  {code.used} / {code.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function Admin() {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

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
        <Codes />
        <br />
        <Credits />
      </Container>
    </>
  );
}
