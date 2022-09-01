import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const themeData = {
  palette: {
    primary: {
      main: "#556cd6",
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: red.A400,
    },
  },
};

// Create a theme instance.
const theme = {
  ltr: createTheme({ ...themeData, direction: "ltr" }),
  rtl: createTheme({ ...themeData, direction: "rtl" }),
};

export default theme;
