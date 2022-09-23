import React from "react";
import { Trans } from "@lingui/macro";
import { Box, Button, Divider } from "@mui/material";

import Link from "../Link";

export default function SDFooter() {
  return (
    <>
      <p>
        If you get back a BLACK image, possible NSFW (18+) content was detected
        and blocked. If you think that&apos;s a mistake, just generate another
        image and the next one will probably work fine. We&apos;ll soon offer a
        way to do user age verification and allow you turn this feature off.
      </p>
      <Divider />
      <Box sx={{ textAlign: "center" }}>
        <Button
          variant="outlined"
          component={Link}
          href="/resources"
          sx={{ my: 2, mx: 1, width: "130px" }}
        >
          <Trans>Resources</Trans>
        </Button>

        <Button
          variant="outlined"
          component={Link}
          href="/news"
          sx={{ my: 2, mx: 1, width: "130px" }}
        >
          <Trans>News</Trans>
        </Button>
      </Box>
    </>
  );
}
