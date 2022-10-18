import React from "react";
import { Box, Button, Container } from "@mui/material";
import {
  useGongoLive,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
} from "gongo-client-react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";

import MyAppBar from "../src/MyAppBar";
import Starred from "../src/Starred";

function SetUsername() {
  const [editable, setEditable] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [username, setUsername] = React.useState("");

  function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setSaving(true);
    console.log({ username });
  }

  return (
    <Box>
      {editable ? (
        <form onSubmit={submit}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input type="submit" disabled={saving} />
        </form>
      ) : (
        <Button onClick={() => setEditable(true)}>
          <Trans>Change my Username</Trans>
        </Button>
      )}
    </Box>
  );
}

export default function Profile() {
  const router = useRouter();
  const { _id } = router.query;
  const query =
    _id?.length === 24 ? { $or: [{ _id }, { username: _id }] } : { _id };

  const userId = useGongoUserId();
  const user = useGongoOne((db) => db.collection("users").find(query));
  const items = useGongoLive((db) =>
    db.collection("stars").find({ userId: _id }).sort("date", "desc")
  );

  const username = (user && (user.username as string)) || t`Anonymous User`;

  useGongoSub("stars", { userId: _id });

  return (
    <Box>
      <MyAppBar title={username} />
      <Container sx={{ my: 2 }}>
        {/* <Typography variant="h6">{username}</Typography> */}
        {userId == _id && <SetUsername />}
        <Starred items={items} />
      </Container>
    </Box>
  );
}
