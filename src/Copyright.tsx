import * as React from "react";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { Trans } from "@lingui/macro";

import Link from "./Link";

export default function Copyright() {
  return (
    <div>
      <Typography variant="body2" color="text.secondary" align="center">
        Copyright © 2022 by Gadi Cohen (gadicc)
        <br />
        and Wastelands Networking Ltd.
        <br />
        <MuiLink
          color="inherit"
          href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa"
        >
          SD-MUI on GitHub
        </MuiLink>
        {" | "}
        <MuiLink href="/tos.html">
          <Trans>Terms of Service</Trans>
        </MuiLink>
        {" | "}
        <Link href="/privacy">
          <Trans>Privacy Policy</Trans>
        </Link>
      </Typography>
    </div>
  );
}
