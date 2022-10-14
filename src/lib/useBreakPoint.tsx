import { useMediaQuery, useTheme } from "@mui/material";

interface BreakPointSwitchCase<T> {
  xs: T;
  sm: T;
  md: T;
  lg: T;
  xl: T;
  default?: T;
}

function useBreakPoint(): string | undefined;
function useBreakPoint<T>(switchCase: BreakPointSwitchCase<T>): T;
function useBreakPoint<T>(switchCase?: BreakPointSwitchCase<T>) {
  const theme = useTheme();
  const xs = useMediaQuery(theme.breakpoints.only("xs"));
  const sm = useMediaQuery(theme.breakpoints.only("sm"));
  const md = useMediaQuery(theme.breakpoints.only("md"));
  const lg = useMediaQuery(theme.breakpoints.only("lg"));
  const xl = useMediaQuery(theme.breakpoints.only("xl"));

  if (!switchCase) {
    if (xs) return "xs";
    if (sm) return "sm";
    if (md) return "md";
    if (lg) return "lg";
    if (xl) return "xl";
    return undefined;
  }

  if (xs) return switchCase.xs;
  if (sm) return switchCase.sm;
  if (md) return switchCase.md;
  if (lg) return switchCase.lg;
  if (xl) return switchCase.xl;
  return switchCase.default;
}

export default useBreakPoint;
