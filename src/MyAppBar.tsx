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
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  SwipeableDrawer,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";

import Link from "../src/Link";
import locales from "../src/lib/locales";

const drawerWidth = 240;

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

  const [mobileOpen, setMobileOpen] = React.useState(false);

  /*
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  */

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }

      setMobileOpen(open);
    };

  const drawer = (
    <Box
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Typography variant="h6" sx={{ my: 2, ml: 4 }}>
        SD-MUI
      </Typography>
      <Divider />
      <List>
        <ListItem>
          <ListItemButton component={Link} href="/">
            <ListItemText>
              <Trans>Home</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton component={Link} href="/txt2img">
            <ListItemText>
              <Trans>Text to Image</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton component={Link} href="/img2img">
            <ListItemText>
              <Trans>Image to Image</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton component={Link} href="/inpaint">
            <ListItemText>
              <Trans>Inpainting</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <Divider />

        <ListItem>
          <ListItemButton component={Link} href="/credits">
            <ListItemText>
              <Trans>Credits:</Trans>{" "}
              {user && user.credits.free + user.credits.paid}
            </ListItemText>
          </ListItemButton>
        </ListItem>

        <ListItem>
          <ListItemButton component={Link} href="/resources">
            <ListItemText>
              <Trans>Resources</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton component={Link} href="/news">
            <ListItemText>
              <Trans>News</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            component={Link}
            href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa"
          >
            <ListItemText>
              <Trans>GitHub</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton component={Link} href="/about">
            <ListItemText>
              <Trans>About</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
        {isAdmin ? (
          <ListItem>
            <ListItemButton component={Link} href="/admin">
              <ListItemText>
                <Trans>Admin</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
        ) : undefined}
      </List>
    </Box>
  );

  const container =
    window !== undefined ? () => window.document.body : undefined;

  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
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

      <Box component="nav">
        <SwipeableDrawer
          swipeAreaWidth={15}
          hysteresis={0.3}
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
          container={container}
          open={mobileOpen}
          onClose={toggleDrawer(false)}
          onOpen={toggleDrawer(true)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </SwipeableDrawer>
      </Box>
    </Box>
  );
}
