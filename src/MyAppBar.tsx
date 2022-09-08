import * as React from "react";
import { useRouter } from "next/router";
import { Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";

import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  // Tooltip,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";

import Link from "../src/Link";
import locales from "../src/lib/locales";

export default function MyAppBar({ title }: { title: string }) {
  const router = useRouter();
  const { pathname, asPath, query } = router;
  const [anchorElLang, setAnchorElLang] = React.useState<null | HTMLElement>(
    null
  );

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const isAdmin = user && user.admin;

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenu}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose} component={Link} href="/">
              <Trans>Home</Trans>
            </MenuItem>
            <MenuItem onClick={handleClose} component={Link} href="/txt2img">
              <Trans>Text to Image</Trans>
            </MenuItem>
            <MenuItem onClick={handleClose} component={Link} href="/img2img">
              <Trans>Image to Image</Trans>
            </MenuItem>
            <MenuItem onClick={handleClose} component={Link} href="/inpainting">
              <Trans>Inpainting</Trans>
            </MenuItem>
            <MenuItem onClick={handleClose} component={Link} href="/about">
              <Trans>About</Trans>
            </MenuItem>
            {isAdmin ? (
              <MenuItem onClick={handleClose} component={Link} href="/admin">
                <Trans>Admin</Trans>
              </MenuItem>
            ) : undefined}
          </Menu>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={(event) => setAnchorElLang(event.currentTarget)}
          >
            <LanguageIcon />
          </IconButton>
          <Menu
            id="lang-select"
            anchorEl={anchorElLang}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            open={Boolean(anchorElLang)}
            onClose={() => setAnchorElLang(null)}
            sx={{
              display: { xs: "block", md: "block" },
            }}
          >
            {Object.values(locales).map((locale) => (
              <MenuItem
                key={locale.id}
                onClick={() => {
                  router.push({ pathname, query }, asPath, {
                    locale: locale.id,
                  });
                  setAnchorElLang(null);
                }}
              >
                <Typography textAlign="center">
                  <Link
                    href={asPath}
                    color="inherit"
                    underline="none"
                    locale={locale.id}
                  >
                    {locale.label[locale.id]}
                  </Link>
                </Typography>
              </MenuItem>
            ))}
          </Menu>
          {user ? (
            <Box sx={{ flexGrow: 0 }}>
              {/* <Tooltip title="Open settings"> */}
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar
                  alt={
                    typeof user.displayName === "string"
                      ? user.displayName
                      : "avatar"
                  }
                  src={
                    /* @ts-expect-error: TODO */
                    user.photos[0].value
                  }
                  imgProps={{ referrerPolicy: "no-referrer" }}
                />
              </IconButton>
              {/* </Tooltip> */}
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem component={Link} href="/credits">
                  <Trans>Credits:</Trans>{" "}
                  {user.credits.free + user.credits.paid}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleCloseUserMenu();
                    /* @ts-expect-error: TODO */
                    db.auth.clear();
                  }}
                >
                  <Typography textAlign="center">
                    <Trans>Logout</Trans>
                  </Typography>
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button
              color="inherit"
              component={Link}
              href={"/login?from=" + location.pathname + location.search}
            >
              <Trans>Login</Trans>
            </Button>
          )}{" "}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
