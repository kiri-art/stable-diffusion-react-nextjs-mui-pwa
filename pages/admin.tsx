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
import { TableVirtuoso, TableComponents } from "react-virtuoso";

import MyAppBar from "../src/MyAppBar";
import { creditCodeSchema, User } from "../src/schemas";

const VirtuosoTableComponents: TableComponents<User> = {
  // eslint-disable-next-line react/display-name
  Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
    <TableContainer component={Paper} {...props} ref={ref} />
  )),
  Table: (props) => (
    <Table
      {...props}
      sx={{ borderCollapse: "separate", tableLayout: "fixed" }}
    />
  ),
  TableHead,
  TableRow: ({ item: _item, ...props }) => <TableRow {...props} />,
  // eslint-disable-next-line react/display-name
  TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
    <TableBody {...props} ref={ref} />
  )),
};

function fixedHeaderContent() {
  const sx = {
    backgroundColor: "background.paper",
  };
  return (
    <TableRow>
      <TableCell sx={sx} variant="head">
        User
      </TableCell>
      <TableCell sx={sx} variant="head" align="right">
        Free
      </TableCell>
      <TableCell sx={sx} variant="head" align="right">
        Paid
      </TableCell>
    </TableRow>
  );
}

function rowContent(_index: number, user: User) {
  function onClick(userId: string, field: string, oldValue: number) {
    return function () {
      const textValue = prompt("New Value?  Was: " + oldValue);
      if (!textValue) return alert("Invalid value");
      const newValue = parseFloat(textValue);
      const query = { $set: { [field]: newValue } };
      db.collection("users").update(userId, query);
    };
  }

  return (
    <React.Fragment>
      <TableCell component="th" scope="row">
        {user.displayName}
        {user.username && " (" + user.username + ")"}
        <br />
        {user.emails?.[0]?.value}
      </TableCell>
      <TableCell
        align="right"
        style={{ cursor: "pointer" }}
        onClick={onClick(user._id, "credits.free", user.credits?.free)}
      >
        {user.credits?.free?.toFixed(2)}
      </TableCell>
      <TableCell
        align="right"
        style={{ cursor: "pointer" }}
        onClick={onClick(user._id, "credits.paid", user.credits?.paid)}
      >
        {user.credits?.paid?.toFixed(2)}
      </TableCell>
    </React.Fragment>
  );
}

function Credits() {
  useGongoSub(
    "usersAndCredits",
    {},
    {
      sort: ["createdAt", "desc"],
      limit: 50,
      minInterval: 500,
      maxInterval: 5000,
      persist: false,
    }
  );
  const [filter, setFilter] = React.useState("");
  const _users = useGongoLive((db) => db.collection("users").find());
  const users = React.useMemo(() => {
    const re = new RegExp(filter, "i");
    return _users.filter((user) => {
      if (!filter) return true;
      if (re.test(user.displayName)) return true;
      for (const email of user.emails) if (re.test(email.value)) return true;
      if (user.username && re.test(user.username)) return true;
      return false;
    });
  }, [_users, filter]);

  return (
    <Box>
      <Typography variant="h6">Users and Credits</Typography>
      <TextField
        size="small"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      <p>Total users: {users.length}</p>

      <Paper style={{ height: "80vh", width: "100%" }}>
        <TableVirtuoso
          data={users}
          components={VirtuosoTableComponents}
          fixedHeaderContent={fixedHeaderContent}
          itemContent={rowContent}
        />
      </Paper>
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

  React.useEffect(() => {
    // @ts-expect-error: todo
    const pollInterval = db.transport.options.pollInterval;
    // @ts-expect-error: todo
    db.transport.options.pollInterval = 1000;
    // @ts-expect-error: todo
    return () => (db.transport.options.pollInterval = pollInterval);
  }, []);

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
