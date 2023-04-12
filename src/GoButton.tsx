import { Trans, Plural } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";

import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

import { isDev, REQUIRE_REGISTRATION } from "./lib/client-env";

export default function GoButton({
  disabled,
  dest,
  setDest,
  credits,
}: {
  disabled: boolean;
  dest: string;
  setDest: React.Dispatch<React.SetStateAction<string>>;
  credits: number;
}) {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  const userCredits = user?.credits?.free + user?.credits?.paid;

  return (
    <>
      <Grid container sx={{ my: 1 }}>
        <Grid
          item
          xs={/*isDev ? 7 : */ 12}
          sm={/*isDev ? 8 : */ 12}
          md={/*isDev ? 9 : */ 12}
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
              return (
                <Plural value={credits} one="# Credit" other="# Credits" />
              );
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
        </Grid>
        {/* 
        {isDev && (
          <Grid item xs={5} sm={4} md={3} sx={{ pl: 1, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dest-select-label">Dest</InputLabel>
              <Select
                labelId="dest-select-label"
                id="dest-select"
                value={dest}
                label="Dest"
                onChange={(e) => setDest(e.target.value as string)}
              >
                <MenuItem value="exec">exec (local)</MenuItem>
                <MenuItem value="banana-local">banana (local)</MenuItem>
                <MenuItem value="banana-remote">banana (remote)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
        */}
      </Grid>
    </>
  );
}
