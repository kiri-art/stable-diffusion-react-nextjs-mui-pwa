import * as React from "react";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";

export default function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      Copyright © Gadi Cohen, 2022.{" "}
      <MuiLink
        color="inherit"
        href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa"
      >
        SD-MUI on GitHub
      </MuiLink>
    </Typography>
  );
}
