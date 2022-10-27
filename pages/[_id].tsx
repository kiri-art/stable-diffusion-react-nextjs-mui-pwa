import React from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import {
  db,
  useGongoLive,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
} from "gongo-client-react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";

import MyAppBar from "../src/MyAppBar";
import Starred from "../src/Starred";
import { Edit } from "@mui/icons-material";
import { useGongoIsPopulated } from "gongo-client-react";

function Username({
  userId,
  username,
  isUser,
}: {
  userId: string;
  username: string;
  isUser: boolean;
}) {
  const [editable, setEditable] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState(username);
  const [notAvailable, setNotAvailable] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editable) inputRef.current && inputRef.current.focus();
  }, [editable]);

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (newUsername == "" || newUsername === username)
      return setEditable(false);
    setSaving(true);
    console.log({ username });

    let result;
    try {
      result = await db.call("setUserName", { username: newUsername });
    } catch (e) {
      console.log(e);
      alert(e);
    }

    setSaving(false);

    console.log(result);
    if (typeof result !== "object" || result === undefined) {
      alert("no result, sorry :/");
      return;
    }

    if (result.status === "USERNAME_NOT_AVAILABLE") {
      setNotAvailable(true);
    } else if (result.status === "OK") {
      setNotAvailable(false);
      // setEditable(false);
      const user = db.collection("users").findOne(userId);
      const updatedUser = { ...user, username: newUsername };
      // @ts-expect-error: userID
      db.collection("users")._update(userId, updatedUser);
      setEditable(false);
    } else {
      alert("unexpected result, sorry :/ " + JSON.stringify(result));
    }
  }

  return (
    <Box>
      <Typography variant="h6">
        {editable ? (
          <form onSubmit={submit}>
            <input
              ref={inputRef}
              type="text"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
            />
            <input
              type="submit"
              disabled={saving}
              value={newUsername ? t`Save` : t`Cancel`}
            />
            {notAvailable && (
              <span style={{ color: "red", fontSize: "90%" }}>
                <br />
                <Trans>Username not available.</Trans>
              </span>
            )}
          </form>
        ) : (
          <>
            <span>{username || t`Anonymous User`}</span>
            {isUser && (
              <IconButton onClick={() => setEditable(!editable)}>
                <Edit sx={{ fontSize: "60%" }} />
              </IconButton>
            )}
          </>
        )}
      </Typography>
      <div style={{ color: "#aaa", fontSize: "80%" }}>
        kiri.art/{newUsername || username || "p/" + userId}
      </div>
    </Box>
  );
}

export default function Profile() {
  const router = useRouter();
  const { _id } = router.query;
  const query =
    _id?.length === 24
      ? { $or: [{ _id }, { username: _id }] }
      : { username: _id };

  const userId = useGongoUserId();
  const user = useGongoOne((db) => db.collection("userProfiles").find(query));
  const items = useGongoLive(
    (db) =>
      user &&
      db
        .collection("stars")
        .find({ userId: user._id, deleted: { $ne: true } })
        .sort("date", "desc")
  );
  const populated = useGongoIsPopulated();

  const username = user
    ? (user.username as string) || t`Anonymous User`
    : t`User not found`;

  useGongoSub(
    "stars",
    query.username ? { username: query.username } : { userId: _id }
  );

  return (
    <Box>
      <MyAppBar title={username} />
      <Container sx={{ my: 2 }}>
        {!populated && <div>{t`Loading...`}</div>}
        {!user && <div>{t`User not found`}</div>}
        {user && (
          <>
            <Username
              userId={_id as string}
              username={(user && (user.username as string)) || ""}
              isUser={user && userId == user._id}
            />
            <Starred items={items} />
            <div style={{ height: "4px" }} />
          </>
        )}
      </Container>
    </Box>
  );
}
