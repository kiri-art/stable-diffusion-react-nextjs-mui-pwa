import React from "react";
import { Trans } from "@lingui/macro";
import { Box, Button, Divider } from "@mui/material";

import Link from "../Link";

export default function SDFooter() {
  return (
    <>
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
