import * as React from "react";
import type { NextPage } from "next";
import { t, Trans } from "@lingui/macro";

import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import Link from "../src/Link";
import MyAppBar from "../src/MyAppBar";
import Copyright from "../src/Copyright";
import { useGongoLive, useGongoSub, db } from "gongo-client-react";
import Starred from "../src/Starred";
import useOver18 from "../src/lib/useOver18";
import { useRouter } from "next/router";
import { Clear, GridView, Help, Splitscreen } from "@mui/icons-material";
import { NUM_REPORTS_UNTIL_REMOVAL } from "../src/lib/constants";

function TextFieldDebounced({
  currentValue,
  onChange,
}: {
  currentValue: string;
  onChange: (value: string) => void;
}) {
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (value !== currentValue) {
      console.log(1);
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
      timeout.current = setTimeout(() => onChange(value), 750);
    }
    return () => {
      timeout.current && clearTimeout(timeout.current);
    };
  }, [onChange, value, currentValue]);

  React.useEffect(() => {
    const Stars = db.collection("stars");
    if (
      Stars.find().count() > 300 &&
      !Stars.findOne("6355699c24ed079e88103b7b")
    ) {
      console.log("Bad 'star' subscription repair");
      const sub = db.subscriptions.get('["stars"]');
      if (sub && sub.updatedAt) sub.updatedAt.stars = 0;
    }
  }, []);

  return React.useMemo(
    () => (
      <TextField
        placeholder={t`Filter`}
        size="small"
        fullWidth
        sx={{ mt: 1 }}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setValue(event.target.value)
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {value != "" && (
                <IconButton onClick={() => setValue("")} edge="end">
                  <Clear />
                </IconButton>
              )}

              <Tooltip
                title={
                  <Box>
                    <Trans>
                      Only show stars with matching prompts. More advanced
                      filters coming soon. Separate multiple terms with a pipe
                      (&quot;|&quot;) character.
                    </Trans>
                  </Box>
                }
                enterDelay={0}
                enterTouchDelay={0}
                leaveDelay={0}
                leaveTouchDelay={4000}
              >
                <Help />
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    ),
    [value]
  );
}

const Home: NextPage = () => {
  const router = useRouter();

  // const [nsfwFilter, setNsfwFilter] = React.useState(true);
  const nsfwFilter =
    !router.query.nsfwFilter || router.query.nsfwFilter === "true";
  const setNsfw = (nsfwFilter: boolean) =>
    router.replace(
      { pathname: "/", query: { ...router.query, nsfwFilter } },
      undefined,
      { shallow: true, scroll: false }
    );

  // const [show, setShow] = React.useState("recent");
  const show = router.query.show || "recent";
  const setShow = (show: string) =>
    router.replace(
      { pathname: "/", query: { ...router.query, show } },
      undefined,
      { shallow: true, scroll: false }
    );

  const explicit = router.query.explicit === "true" ? true : false;
  const setExplicit = (explicit: boolean) =>
    router.replace(
      { pathname: "/", query: { ...router.query, explicit } },
      undefined,
      { shallow: true, scroll: false }
    );

  const filter =
    typeof router.query.filter === "string" ? router.query.filter : "";
  const setFilter = React.useCallback(
    (filterOrEvent: string | React.ChangeEvent<HTMLInputElement>) => {
      const filter =
        typeof filterOrEvent === "string"
          ? filterOrEvent
          : filterOrEvent.target.value;
      router.replace(
        { pathname: "/", query: { ...router.query, filter } },
        undefined,
        { shallow: true, scroll: false }
      );
    },
    [router]
  );

  const over18 = useOver18();

  // const [useGrid, setUseGrid] = React.useState(true);
  const useGrid = !router.query.useGrid || router.query.useGrid === "true";
  const setUseGrid = (useGrid: boolean) =>
    router.replace(
      { pathname: "/", query: { ...router.query, useGrid } },
      undefined,
      { shallow: true, scroll: false }
    );

  const query: Record<string, unknown> = {};
  if (!router.query.showDeleted) query.deleted = { $ne: true };
  if (!router.query.showReported)
    query.$or = [
      { reports: { $exists: false } },
      { reports: { $lt: NUM_REPORTS_UNTIL_REMOVAL } },
    ];
  const sortField = show === "recent" ? "date" : "likes";
  if (nsfwFilter)
    query.$or = [
      { "callInputs.safety_checker": true },
      { "callInputs.safety_checker": { $exists: false } },
      { "callInputs.safety_checker": null },
    ];

  if (!nsfwFilter && !explicit)
    query["modelInputs.prompt"] = {
      $not: /tits|cum|dick|pussy|loli|sex|ejaculation|vagina|penis/i,
    };

  const items = useGongoLive(
    (db) => db.collection("stars").find(query).sort(sortField, "desc") //.limit(100)
  );

  // We don't do this as part of the gongo query because the regexp instance doesn't
  // serialize and breaks the hasQueryChanged check (TODO in gongo)
  const filteredItems = React.useMemo(() => {
    const reFilter = new RegExp(filter, "i");

    return items.filter((item) => {
      const prompt = item?.modelInputs?.prompt;
      if (prompt && prompt.match(reFilter)) return true;
    });
  }, [items, filter]);

  const starsFiltered = useGongoSub(
    "stars",
    { nsfw: false },
    { sort: [sortField, "desc"], limit: 20 }
  );
  const starsNSFW = useGongoSub(
    nsfwFilter === false && "stars",
    { nsfw: true },
    { sort: [sortField, "desc"], limit: 20 }
  );

  function loadMore() {
    // console.log("loadMore");
    if (
      starsFiltered.sub &&
      starsFiltered.sub.lastSortedValue &&
      starsFiltered.sub.lastSortedValue !== "__END__"
    )
      starsFiltered.loadMore();
    if (
      starsNSFW.sub &&
      starsNSFW.sub.lastSortedValue &&
      starsNSFW.sub.lastSortedValue !== "__END__"
    )
      starsNSFW.loadMore();
  }

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
          <FormGroup sx={{ justifyContent: "center", flexDirection: "row" }}>
            <FormControlLabel
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
            {!nsfwFilter && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={explicit}
                    onChange={(event) => setExplicit(event.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Trans>Explicit</Trans>
                  </Box>
                }
              />
            )}
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
        <Box sx={{ textAlign: "center" }}>
          <TextFieldDebounced currentValue={filter} onChange={setFilter} />
        </Box>
        <Starred
          items={filteredItems}
          cols={useGrid ? undefined : 1}
          loadMore={loadMore}
        />
        <Copyright />
      </Container>
    </>
  );
};

export default Home;
