import React from "react";
import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { db } from "gongo-client-react";

import { Button, Container, Typography } from "@mui/material";

import MyAppBar from "../../src/MyAppBar";
import Link from "next/link";

export default function AccountData() {
  useLingui();
  const [value, setValue] = React.useState("");
  const [destroying, setDestroying] = React.useState("");

  async function destroy() {
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    setDestroying("busy");
    await sleep(1000);
    setDestroying("done");
  }

  return (
    <>
      <MyAppBar title={t`My Data`} />
      <Container sx={{ p: 3 }}>
        <Typography variant="h5">
          <Trans>Privacy</Trans>
        </Typography>
        <ul>
          <style jsx>{`
            li {
              margin-bottom: 0.5em;
            }
          `}</style>
          <li>
            <Trans>
              Your data is stored in our database in <b>Paris, France</b>.
            </Trans>
          </li>
          <li>
            <Trans>
              Your <b>history</b> is stored on your local device only, and is
              not backed up to our servers.
            </Trans>{" "}
            <Trans>
              We keep a log of <b>user requests</b> that{" "}
              <i>do not include prompts</i> nor input images or result images
              (except for images you&apos;ve starred).
            </Trans>
          </li>
          <li>
            <Trans>
              Your <b>IP address</b> and user agent is recorded on each
              successful log in.
            </Trans>
          </li>
          <li>
            <Trans>
              See also our <Link href="/tos.html">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>
            </Trans>
          </li>
        </ul>
        <p>
          <Trans>
            You can download your data at anytime, in a ZIP file (of JSON
            collections). This includes <b>all data</b> in our database
            associated with your account.
          </Trans>
        </p>
        <a href={"/api/myData?sessionId=" + db?.auth?.sessionId}>
          <Button variant="contained">Download Zip</Button>
        </a>

        <br />
        <br />

        <Typography variant="h5">
          <Trans>Delete My Account</Trans>
        </Typography>

        <p style={{ color: "red" }}>
          STILL WORKING ON THIS. Doesn&apos;t work yet. Email support if you
          need your data deleted before this is ready.
        </p>

        <p>
          <Trans>
            Use the button below to <b>irreversably</b> delete your account and
            all associated data.
          </Trans>{" "}
          <Trans>Type the text in the box below to enable this service.</Trans>
        </p>

        <div style={{ position: "relative" }}>
          <input
            style={{
              position: "absolute",
              top: 0,
              color: "#aaa",
              padding: "5px 10px 5px 10px",
              fontSize: "1em",
              width: 300,
            }}
            defaultValue="PERMANENTLY ERASE MY DATA"
          />
          <input
            style={{
              position: "absolute",
              top: 0,
              background: "none",
              padding: "5px 10px 5px 10px",
              fontSize: "1em",
              width: 300,
            }}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
          />
        </div>
        <br />
        <br />

        <Button
          variant="contained"
          disabled={value !== "PERMANENTLY ERASE MY DATA" || destroying !== ""}
          onClick={destroy}
        >
          {destroying === "" ? (
            <Trans>Destroy my Data</Trans>
          ) : destroying === "busy" ? (
            <Trans>Destroying...</Trans>
          ) : destroying === "done" ? (
            <Trans>Done!</Trans>
          ) : (
            destroying
          )}
        </Button>

        <p>
          <Trans>
            Note: this only deletes your data from our servers and{" "}
            <b>this device</b>. If you have used our app on other devices, you
            should uninstall it there too (or clear the browser&apos;s local
            storage).
          </Trans>
        </p>
      </Container>
    </>
  );
}
