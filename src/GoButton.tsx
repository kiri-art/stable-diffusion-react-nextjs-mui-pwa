import { Trans, Plural } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";

import { Box, Button, Container } from "@mui/material";

import { /* isDev, */ REQUIRE_REGISTRATION } from "./lib/client-env";

export default function GoButton({
  disabled,
  // _dest,
  // _setDest,
  credits,
}: {
  disabled: boolean;
  // _dest: string;
  // _setDest: React.Dispatch<React.SetStateAction<string>>;
  credits: number;
}) {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  const userCredits = (user?.credits?.free || 0) + (user?.credits?.paid || 0);

  return (
    <Container
      sx={{
        position: "sticky",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 10%, rgba(255,255,255,1) 100%)",
        textAlign: "center",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 100,
        px: 0,
        pt: 1,
      }}
    >
      <Button
        variant="contained"
        fullWidth
        sx={{ my: 1 }}
        type="submit"
        disabled={disabled}
      >
        {(function () {
          if (!REQUIRE_REGISTRATION) return <Trans>Go</Trans>;
          if (!user) return <Trans>Login</Trans>;
          if (!(userCredits && userCredits > credits))
            return <Trans>Get More Credits</Trans>;
          return <Plural value={credits} one="# Credit" other="# Credits" />;
        })()}
      </Button>
      {REQUIRE_REGISTRATION && user && (
        <Box
          sx={{
            fontSize: "70%",
            color: "#aaa",
            textAlign: "center",
            mt: -0.5,
            mb: 1,
          }}
        >
          <Plural
            value={userCredits}
            one="# credit remaining"
            other="# credits remaining"
          />
        </Box>
      )}
    </Container>
  );
}
