import { Trans } from "@lingui/react/macro";
import { Container, Typography } from "@mui/material";
import { useRouter } from "next/router";

import MyAppBar from "../src/MyAppBar";
import { ItemGrid, itemData } from "./start";

const items = itemData.filter((item) => item.href !== "/txt2img");

export default function ShareTarget() {
  const router = useRouter();

  return (
    <>
      <MyAppBar title="Share" />
      <Container>
        <Typography variant="h6" sx={{ textAlign: "center", mb: 2 }}>
          <Trans>Choose Share Target</Trans>
        </Typography>
        <ItemGrid items={items} router={router} />
      </Container>
    </>
  );
}
