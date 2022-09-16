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
          sx={{ m: 2, width: "150px" }}
        >
          <Trans>Resources</Trans>
        </Button>

        <Button
          variant="outlined"
          component={Link}
          href="/news"
          sx={{ m: 2, width: "150px" }}
        >
          <Trans>News</Trans>
        </Button>
      </Box>
    </>
  );
}
