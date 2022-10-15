import React from "react";
import { t } from "@lingui/macro";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

const state: {
  resolve: ((value: boolean | PromiseLike<boolean>) => void) | null;
  setOpen: React.Dispatch<React.SetStateAction<boolean>> | null;
  setTitle: React.Dispatch<React.SetStateAction<string>> | null;
  setText: React.Dispatch<React.SetStateAction<string>> | null;
  setOkText: React.Dispatch<React.SetStateAction<string>> | null;
  setCancelText: React.Dispatch<React.SetStateAction<string>> | null;
} = {
  resolve: null,
  setOpen: null,
  setTitle: null,
  setText: null,
  setOkText: null,
  setCancelText: null,
};

const close = (response: boolean) => () => {
  state.setOpen && state.setOpen(false);
  state.resolve && state.resolve(response);
};

export function ConfirmDialog() {
  const [open, _setOpen] = React.useState(false);
  const [title, _setTitle] = React.useState("");
  const [text, _setText] = React.useState("");
  const [okText, _setOkText] = React.useState("");
  const [cancelText, _setCancelText] = React.useState("");

  React.useEffect(() => {
    state.setOpen = _setOpen;
    state.setTitle = _setTitle;
    state.setText = _setText;
    state.setOkText = _setOkText;
    state.setCancelText = _setCancelText;
    return () => {
      state.setOpen = null;
    };
  }, [_setOpen]);

  return (
    <Dialog
      open={open}
      onClose={close(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      keepMounted
    >
      {title && <DialogTitle id="alert-dialog-title">{title}</DialogTitle>}
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {text}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={close(false)}>
          {cancelText || t`Cancel`}
        </Button>
        <Button variant="contained" onClick={close(true)} autoFocus>
          {okText || t`OK`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ConfirmOptions {
  title: string;
  text: string;
  ok?: string;
  cancel?: string;
}

export default function asyncConfirm(text: string): Promise<boolean>;
export default function asyncConfirm(options: ConfirmOptions): Promise<boolean>;
export default function asyncConfirm(arg: string | ConfirmOptions) {
  return new Promise((_resolve) => {
    state.resolve = _resolve;
    if (typeof arg === "string") {
      const text = arg;
      if (!state.setOpen) _resolve(confirm(text));
      state.setText && state.setText(text);
      state.setTitle && state.setTitle("");
      state.setOkText && state.setOkText("");
      state.setCancelText && state.setCancelText("");
    } else {
      const opts = arg;
      if (!state.setOpen) _resolve(confirm(opts.title || opts.text));
      state.setTitle && state.setTitle(opts.title);
      state.setText && state.setText(opts.text);
      state.setOkText && state.setOkText(opts.ok || "");
      state.setCancelText && state.setCancelText(opts.cancel || "");
    }
    state.setOpen && state.setOpen(true);
  });
}
