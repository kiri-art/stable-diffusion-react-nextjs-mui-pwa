import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import MuiInput from "@mui/material/Input";
import VolumeUp from "@mui/icons-material/VolumeUp";

const Input = styled(MuiInput)`
  width: 42px;
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
  label,
  step,
  min,
  max,
  marks,
}: {
  value: number | string;
  setValue: React.Dispatch<React.SetStateAction<number | string>>;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  marks?: boolean;
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
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <VolumeUp />
        </Grid>
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
      </Grid>
    </Box>
  );
}
