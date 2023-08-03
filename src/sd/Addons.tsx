import React from "react";

import { Button, Container } from "@mui/material";

import type { ModelState } from "./useModelState";

import TextualInversion from "./Addons/TextualInversions";
import LoRAs from "./Addons/LoRAs";
import NewBadge from "../NewBadge";

export default function Addons({ inputs }: { inputs: ModelState }) {
  const [show, setShow] = React.useState(false);

  return (
    <>
      <Button onClick={() => setShow(!show)}>
        {show ? "Hide" : "Show"} Addon Options (WIP experiment)
      </Button>
      <NewBadge />
      {show && (
        <Container
          sx={{
            border: "1px solid #aaa;",
            borderRadius: "5px",
            background: "#fafafa",
          }}
        >
          <p>
            We&apos;re still working on this. Expect things to break! Your
            feedback is greatly appreciated and you can give it in the{" "}
            <a href="https://forums.kiri.art/c/app/17">forums</a>.
          </p>
          <TextualInversion
            inputs={inputs}
            setTextualInversions={inputs.textual_inversions.setValue}
          />
          <LoRAs
            inputs={inputs}
            setLoraWeights={inputs.lora_weights.setValue}
          />
        </Container>
      )}
    </>
  );
}
