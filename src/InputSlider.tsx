import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import UnstyledSlider from "@mui/material/Slider";
import MuiInput from "@mui/material/Input";
import HelpIcon from "@mui/icons-material/HelpOutline";
import Tooltip from "@mui/material/Tooltip";

import { SettingsBackupRestore } from "@mui/icons-material";

const Input = styled(MuiInput)`
  width: 42px;
`;

const Slider = styled(UnstyledSlider)`
  pointer-events: none !important;
  .MuiSlider-thumb {
    pointer-events: all !important;
  }
`;

/**
 * const [value, setValue] = React.useState<
 *  number | string | Array<number | string>
 * >(30);
 * <InputSlider value={value} setValue={setValue} label={label} />
 */
export default function InputSlider({
  value,
  setValue,
  defaultValue,
  label,
  step,
  min,
  max,
  marks,
  tooltip,
  icon,
}: {
  value: number | string;
  setValue: React.Dispatch<React.SetStateAction<number | string>>;
  defaultValue: number | string;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  marks?: boolean;
  tooltip?: NonNullable<React.ReactNode>;
  icon?: React.ReactElement;
}) {
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") setValue(newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value === "" ? "" : Number(event.target.value));
  };

  const handleBlur = () => {
    if (min && value < min) {
      setValue(min);
    } else if (max && value > max) {
      setValue(max);
    }
  };

  return (
    <Box>
      <Typography id="input-slider" gutterBottom>
        {label}
        {tooltip && (
          <Tooltip
            title={tooltip}
            enterDelay={0}
            leaveDelay={0}
            enterTouchDelay={0}
            leaveTouchDelay={4000}
          >
            <HelpIcon sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }} />
          </Tooltip>
        )}
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item>{icon}</Grid>
        <Grid item xs>
          <Slider
            value={typeof value === "number" ? value : 0}
            onChange={handleSliderChange}
            step={step}
            min={min}
            max={max}
            marks={marks}
            aria-labelledby="input-slider"
          />
        </Grid>
        <Grid item>
          <Input
            value={value}
            size="small"
            sx={{ width: 60 }}
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: step,
              min: min,
              max: max,
              type: "number",
              "aria-labelledby": "input-slider",
            }}
          />
        </Grid>
        <Grid item>
          <SettingsBackupRestore
            sx={{ opacity: 0.4 }}
            onClick={() => setValue(defaultValue)}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
