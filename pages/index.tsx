import * as React from "react";
import type { NextPage } from "next";
import { t, Trans } from "@lingui/macro";

import {
  Box,
  Button,
  Container,
  FormControlLabel,
  FormGroup,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import Link from "../src/Link";
import MyAppBar from "../src/MyAppBar";
import Copyright from "../src/Copyright";
import { useGongoLive, useGongoSub } from "gongo-client-react";
import Starred from "../src/Starred";
import useOver18 from "../src/lib/useOver18";
import { useRouter } from "next/router";
import { GridView, Splitscreen } from "@mui/icons-material";
import { NUM_REPORTS_UNTIL_REMOVAL } from "../src/lib/constants";

const Home: NextPage = () => {
  const router = useRouter();

  // const [nsfwFilter, setNsfwFilter] = React.useState(true);
  const nsfwFilter =
    !router.query.nsfwFilter || router.query.nsfwFilter === "true";
  const setNsfw = (nsfwFilter: boolean) =>
    router.replace({ pathname: "/", query: { ...router.query, nsfwFilter } });

  const [show, setShow] = React.useState("recent");
  const over18 = useOver18();

  // const [useGrid, setUseGrid] = React.useState(true);
  const useGrid = !router.query.useGrid || router.query.useGrid === "true";
  const setUseGrid = (useGrid: boolean) =>
    router.replace({ pathname: "/", query: { ...router.query, useGrid } });

  const query: Record<string, unknown> = {};
  if (!router.query.showDeleted) query.deleted = { $ne: true };
  if (!router.query.showReported)
    query.$or = [
      { reports: { $exists: false } },
      { reports: { $lt: NUM_REPORTS_UNTIL_REMOVAL } },
    ];
  const sortField = show === "recent" ? "date" : "likes";
  if (nsfwFilter) query["callInputs.safety_checker"] = true;

  const items = useGongoLive(
    (db) => db.collection("stars").find(query).sort(sortField, "desc") //.limit(100)
  );
  useGongoSub("stars");

  return (
    <>
      <MyAppBar title={t`Home`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <Button variant="contained" component={Link} href="/start">
            <Trans>Start Creating</Trans>
          </Button>
        </Box>
        <br />
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6">
            <Trans>Community</Trans>
          </Typography>
          <Box sx={{ fontSize: "80%" }}>
            <Trans>
              <span style={{ whiteSpace: "nowrap" }}>
                Star images from your <Link href="/history">history</Link>
              </span>{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                and have them appear here too!
              </span>
            </Trans>
          </Box>
          <br />
        </Box>
        {over18 && (
          <FormGroup sx={{ alignItems: "center" }}>
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  checked={nsfwFilter}
                  onChange={(event) => setNsfw(event.target.checked)}
                />
              }
              label={
                <Box>
                  <Trans>NSFW Filter</Trans>
                </Box>
              }
            />
          </FormGroup>
        )}

        <Box sx={{ textAlign: "center" }}>
          <ToggleButtonGroup
            color="primary"
            value={show}
            exclusive
            size="small"
            onChange={(_event, newValue) => newValue && setShow(newValue)}
            aria-label="Platform"
            sx={{ fontSize: "80%" }}
          >
            <ToggleButton value="recent">
              <Trans>Most Recent</Trans>
            </ToggleButton>
            <ToggleButton value="popular">
              <Trans>Most Popular</Trans>
            </ToggleButton>
          </ToggleButtonGroup>{" "}
          <ToggleButtonGroup
            color="primary"
            value={useGrid ? "grid" : "nogrid"}
            exclusive
            size="small"
            onChange={(_event, newValue) => newValue && setUseGrid(!useGrid)}
            aria-label="Platform"
            sx={{ fontSize: "80%", position: "relative", top: 7 }}
          >
            <ToggleButton value="grid">
              <GridView sx={{ fontSize: "170%" }} />
            </ToggleButton>
            <ToggleButton value="nogrid">
              <Splitscreen sx={{ fontSize: "170%" }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Starred items={items} cols={useGrid ? undefined : 1} />
        <Copyright />
      </Container>
    </>
  );
};

export default Home;
