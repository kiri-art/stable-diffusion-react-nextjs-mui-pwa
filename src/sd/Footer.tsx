import React from "react";
import { Divider } from "@mui/material";

import Copyright from "../Copyright";

export default function SDFooter() {
  return (
    <>
      <Divider sx={{ mb: 1 }} />
      <Copyright />
    </>
  );
}
