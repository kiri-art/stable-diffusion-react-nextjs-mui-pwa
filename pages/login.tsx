import React from "react";
import { db, useGongoUserId } from "gongo-client-react";
import { useRouter } from "next/router";

import GoogleIcon from "@mui/icons-material/Google";

import AppBar from "../src/MyAppBar";

import { Container, Box, Button } from "@mui/material";

export default function Login() {
  const router = useRouter();
  const userId = useGongoUserId();

  if (userId) {
    const from = router.query.from;
    router.push(from ? (Array.isArray(from) ? from[0] : from) : "/");
    return null;
  }

  return (
    <Box>
      <AppBar title="Cart" />
      <Container maxWidth="sm" style={{ textAlign: "center" }}>
        <p>
          <img src="/icon.png" alt="logo" width="192" height="192" />
        </p>
        <p>SD-MUI</p>

        <Button
          variant="contained"
          startIcon={<GoogleIcon />}
          style={{
            background: "#57f",
            width: "90%",
          }}
          // @ts-expect-error: TODO
          onClick={() => db.auth.loginWithService("google")}
        >
          Connect with Google
        </Button>
      </Container>
    </Box>
  );
}
