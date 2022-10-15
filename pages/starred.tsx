import { t, Trans } from "@lingui/macro";
import { Box, Container } from "@mui/material";
import { db, useGongoLive, useGongoSub } from "gongo-client-react";
import React from "react";

import Starred from "../src/Starred";
import MyAppBar from "../src/MyAppBar";

export default function StarredPage() {
  // @ts-expect-error: fix in gongo
  const userId = db.auth?.userId;

  const items = useGongoLive((db) =>
    db
      .collection("stars")
      .find({ userId, deleted: { $ne: true } })
      .sort("date", "desc")
  );

  useGongoSub("stars", { userId });

  return (
    <Box>
      <MyAppBar title={t`Starred`} />
      <Container sx={{ my: 2 }}>
        <p>
          <i>
            <Trans>Share your Stars with the World</Trans>
          </i>
        </p>

        <Trans>
          Your <b>starred</b> items are public and appear on your profile.
        </Trans>

        <Starred items={items} />
      </Container>
    </Box>
  );
}
