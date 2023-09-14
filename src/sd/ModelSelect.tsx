import React, { FunctionComponent } from "react";
import { Trans, t } from "@lingui/macro";
import EventListener from "react-event-listener";
import ScrollShadowWrapper from "../lib/ScrollShadowWrapper";

import { AccessTime, ArrowDropDown, SortByAlpha } from "@mui/icons-material";
import {
  Box,
  Container,
  Fade,
  FormControl,
  InputBaseComponentProps,
  InputLabel,
  Modal,
  OutlinedInput,
} from "@mui/material";

import { ModelState } from "./useModelState";
import models from "../config/models";
import type { Model } from "../config/models";
import useOver18 from "../lib/useOver18";

const nsfwTags = [
  "abyssorangemix2_hard",
  "aom2_hard",
  "hard",
  "hardcore",
  "hentai",
  "nudity",
  "porn",
  "sex",
  "sexy",
];

const MyChip = React.memo(function MyChip({
  label,
  style,
}: {
  label: string;
  style?: Record<string, unknown>;
}) {
  return (
    <span
      style={{
        fontSize: "70%",
        padding: "2px 7px 2px 7px",
        margin: "0px 2px 0px 2px",
        border: "1px solid #aaa",
        borderRadius: "10px",
        ...style,
      }}
    >
      {label}
    </span>
  );
});

const SelectRow = React.memo(function SelectRow({
  value,
  setValue,
  selected,
  setOpen,
}: {
  value: string;
  setValue: (value: string) => void;
  selected: boolean;
  setOpen: (value: boolean) => void;
}) {
  const model = models[value];
  let trainedSize = model.trainedSize || "512x512";
  if (!trainedSize) {
    if (model.baseModel.endsWith("768")) trainedSize = "768x768";
    else if (model.baseModel.startsWith("SDXL")) trainedSize = "1024x1024";
  }

  return (
    <div
      key={model.MODEL_ID}
      className="SelectRow"
      onClick={() => {
        setValue(value);
        setOpen(false);
      }}
    >
      <style jsx>{`
        .SelectRow {
          border-top: 1px solid #fff;
          border-bottom: 1px solid #ddd;
          padding: 5px 10px 5px 10px;
          background: ${selected ? "#e0e0ff" : "#f5f5f5"};
          text-align: center;
          user-select: none;
        }
        .SelectRow:hover {
          background: ${selected ? "#f0f0ff" : "#fff"};
        }
      `}</style>
      <div style={{ fontWeight: "bold" }}>{model.MODEL_ID}</div>
      <div
        style={{ fontSize: "85%", whiteSpace: "nowrap", overflow: "hidden" }}
      >
        {model.description}
      </div>
      <div>
        <MyChip label={model.ogModel ? "Official" : "Community"} />
        <MyChip label={model.baseModel} />
        <MyChip label={trainedSize} />
        <MyChip label={model.dateAdded.toLocaleDateString()} />
      </div>
    </div>
  );
});

const sorts = {
  alpha: (a: Model, b: Model) => a.MODEL_ID.localeCompare(b.MODEL_ID),
  date: (a: Model, b: Model) => b.dateAdded.getTime() - a.dateAdded.getTime(),
};

const ModelSelectModalContents = React.forwardRef(
  function ModelSelectModalContents(
    {
      open,
      setOpen,
      value,
      setValue,
      input,
    }: {
      open: boolean;
      setOpen: (value: boolean) => void;
      value: string;
      setValue: (value: string) => void;
      input: HackyModelIdModelState;
    },
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const [baseModelFilter, setBaseModelFilter] = React.useState(
      input.forceBaseModel || "all"
    );
    const [modelOriginFilter, setModelOriginFilter] = React.useState("all");
    const [inpaintFilter, setInpaintFilter] = React.useState(true);
    const [tagFilter, setTagFilter] = React.useState("");
    const inInpaint = location.pathname === "/inpaint";
    const [sort, setSort] = React.useState<"alpha" | "date">("alpha");
    const over18 = useOver18();

    React.useEffect(() => {
      setBaseModelFilter(input.forceBaseModel || "all");
    }, [input.forceBaseModel]);

    React.useEffect(() => {
      input.forceBaseModel = undefined;
    }, [input, baseModelFilter]);

    const filteredModels = React.useMemo(() => {
      const filteredModels = Object.values(models).filter(
        (model) =>
          !model.hidden &&
          (modelOriginFilter === "all" ||
            model.ogModel === (modelOriginFilter === "og" ? true : false)) &&
          (baseModelFilter === "all" || model.baseModel === baseModelFilter) &&
          ((!inInpaint && !model.MODEL_ID.match(/[Ii]npaint/)) ||
            (inInpaint &&
              (!inpaintFilter ||
                (inpaintFilter && model.MODEL_ID.match(/[Ii]npaint/))))) &&
          (tagFilter === "" || model.tags?.includes(tagFilter))
      );
      return filteredModels;
    }, [
      modelOriginFilter,
      baseModelFilter,
      inpaintFilter,
      inInpaint,
      tagFilter,
    ]);

    const sortedModels = React.useMemo(() => {
      return filteredModels.sort(sorts[sort]);
    }, [filteredModels, sort]);

    const baseModels = React.useMemo(
      () => {
        const baseModels = new Set<string>();
        for (const model of Object.values(models)) {
          baseModels.add(model.baseModel);
        }
        return Array.from(baseModels);
      },
      [
        /* models */
      ]
    );

    const allTags = React.useMemo(() => {
      const allTags = new Set<string>();
      for (const model of Object.values(models)) {
        if (model.tags)
          for (const tag of model.tags) {
            if (over18 || !nsfwTags.includes(tag)) allTags.add(tag);
          }
      }

      return Array.from(allTags).sort();
    }, [
      /* models, */
      over18,
    ]);

    return (
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-46%, -50%)",

            width: "101%",
            // maxWidth: 500,
            // bgcolor: "background.paper",
            background: "#dfdfdf",
            border: "2px solid #000",
            boxShadow: 24,
          }}
        >
          <EventListener
            target="window"
            onKeyUp={(event: KeyboardEvent) => {
              if (event.key === "Escape") setOpen(false);
            }}
          />
          <Container sx={{ pt: 2, pb: 1, textAlign: "center" }}>
            <select
              value={baseModelFilter}
              onChange={(e) => setBaseModelFilter(e.target.value)}
              style={{ maxWidth: 75 }}
            >
              <option value="all">Bases</option>
              {baseModels.map((baseModel) => (
                <option key={baseModel} value={baseModel}>
                  {baseModel}
                </option>
              ))}
            </select>{" "}
            <select
              value={modelOriginFilter}
              onChange={(e) => setModelOriginFilter(e.target.value)}
              style={{ maxWidth: 75 }}
            >
              <option value="all">Source</option>
              <option value="og">Official</option>
              <option value="community">Community</option>
            </select>{" "}
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{ maxWidth: 75 }}
            >
              <option value="">Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>{" "}
            <span
              style={{ verticalAlign: "top", position: "relative", top: 2 }}
              onClick={() => setSort(sort === "alpha" ? "date" : "alpha")}
            >
              <SortByAlpha
                fontSize="small"
                style={{ color: sort === "alpha" ? "red" : undefined }}
              />
              <AccessTime
                fontSize="small"
                style={{ color: sort === "date" ? "red" : undefined }}
              />
            </span>{" "}
            {inInpaint && (
              <label style={{ whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={inpaintFilter}
                  onChange={() => setInpaintFilter(!inpaintFilter)}
                />{" "}
                Inpainting
              </label>
            )}
          </Container>
          <ScrollShadowWrapper
            style={{ maxHeight: "90vh", background: "#f5f5f5" }}
          >
            {sortedModels.map((model) => (
              <SelectRow
                key={model.MODEL_ID}
                value={model.MODEL_ID}
                setValue={setValue}
                selected={model.MODEL_ID === value}
                setOpen={setOpen}
              />
            ))}
          </ScrollShadowWrapper>
          {/*
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="outlined" onClick={() => setOpen(false)}>
          <Trans>Cancel</Trans>
        </Button>
        <span style={{ width: ".5em" }} />
        <Button variant="contained" onClick={() => setOpen(false)}>
          <Trans>Select</Trans>
        </Button>
      </Stack>
        */}
          <input type="hidden" ref={ref} tabIndex={-1} />
        </Box>
      </Fade>
    );
  }
);

const ModelSelectSelect = React.forwardRef(function ModelSelectSelect(
  {
    value,
    setValue,
    open,
    setOpen,
    input,
  }: {
    value: string;
    setValue: (value: string) => void;
    open: boolean;
    setOpen: (value: boolean) => void;
    input: HackyModelIdModelState;
  },
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const model = models[value];

  return (
    <div
      style={{
        paddingTop: "10px",
        paddingBottom: "10px",
        paddingLeft: "10px",
        paddingRight: "32px",
        width: "100%",
        textAlign: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <ArrowDropDown
        sx={{
          position: "absolute",
          right: 5,
          height: "1em",
          top: "calc(50% - 0.5em)",
          color: "rgba(0, 0, 0, 0.54)",
        }}
      />
      <div>
        <b>{model.MODEL_ID}</b>
      </div>
      <div>{model.description}</div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        closeAfterTransition
        keepMounted
        sx={{ maxWidth: "90%" }}
        // hideBackdrop
      >
        <ModelSelectModalContents
          open={open}
          value={value}
          setValue={setValue}
          setOpen={setOpen}
          input={input}
          ref={ref}
        />
      </Modal>
    </div>
  );
});

const ModelSelectInputComponent: FunctionComponent<InputBaseComponentProps> =
  React.forwardRef(function ModelSelectInputComponent(props, ref) {
    const { component: Component, ...other } = props;

    // implement `InputElement` interface
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        console.log("ModelSelectInputComponent focus called");
        // logic to focus the rendered component from 3rd party belongs here
      },
      // hiding the value e.g. react-stripe-elements
    }));

    // `Component` will be your `SomeThirdPartyComponent` from below
    return <Component {...other} ref={ref} />;
  });

type HackyModelIdModelState = ModelState["MODEL_ID"] & {
  setOpen?: (value: boolean) => void;
  forceBaseModel?: string;
};

export default React.memo(function ModelSelect({
  value,
  setValue,
  input,
}: {
  value: ModelState["MODEL_ID"]["value"];
  setValue: ModelState["MODEL_ID"]["setValue"];
  input: HackyModelIdModelState;
}) {
  const [open, setOpen] = React.useState(false);
  input.setOpen = setOpen;

  return (
    <FormControl
      fullWidth
      sx={{ my: 1 }}
      focused={open}
      onClick={() => !open && setOpen(!open)}
    >
      <InputLabel shrink={true}>
        <Trans>Model</Trans>
      </InputLabel>
      <OutlinedInput
        notched={true}
        inputComponent={ModelSelectInputComponent}
        inputProps={{
          open,
          setOpen,
          value,
          setValue,
          component: ModelSelectSelect,
          input,
        }}
        label={t`Model`}
        value={value}
      />
      {models[value].notes && (
        <Box sx={{ fontSize: "80%", textAlign: "center" }}>
          {models[value].notes}
        </Box>
      )}
    </FormControl>
  );
});
