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
      <div style={{ textAlign: "justify" }}>
        <span style={{ color: "red" }}>
          Thanks everyone for your patience. Provider 2 is now the default, at
          0.25 credits per generation until we work out all the bugs. You can
          still switch between them below, if one is not working. Discussion,
          bug reports, feature requests on{" "}
          <a href="https://forums.kiri.art/c/app/17">official forum</a>.
        </span>
      </div>
    </>
  );
}
