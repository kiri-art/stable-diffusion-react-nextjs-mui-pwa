import React from "react";
import { useRouter } from "next/router";
import { useGongoLive, useGongoSub } from "gongo-client-react";
import { Box, Container } from "@mui/material";
import { t } from "@lingui/macro";

import Starred from "../../src/Starred";
import MyAppBar from "../../src/MyAppBar";

export default function Profile() {
  const router = useRouter();
  const { _id: userId } = router.query;

  const items = useGongoLive((db) =>
    db.collection("stars").find({ userId }).sort("date", "desc")
  );

  useGongoSub("stars", { userId });

  return (
    <Box>
      <MyAppBar title={t`Profile`} />
      <Container sx={{ my: 2 }}>
        <Starred items={items} />
      </Container>
    </Box>
  );
}
