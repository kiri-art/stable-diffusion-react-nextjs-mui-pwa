import * as React from "react";
import { useRouter } from "next/router";
import { Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import Image from "next/image";

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
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Slide,
  useScrollTrigger,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Language as LanguageIcon,
  Home,
  Newspaper,
  GitHub,
  Info,
  AdminPanelSettings,
  Bookmarks,
  ConfirmationNumber,
  ShowChart,
} from "@mui/icons-material";

import Link from "../src/Link";
import locales from "../src/lib/locales";
import { creditsStrOrFalse } from "../pages/credits";

const drawerWidth = 260;

function HideOnScroll({ children }: { children: React.ReactElement }) {
  const trigger = useScrollTrigger();

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

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
  const userCredits = creditsStrOrFalse(user);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  /*
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  */

  const toggleDrawer = React.useCallback(
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
    },
    []
  );

  const drawer = React.useMemo(
    () => (
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
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/">
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText>
                <Trans>Home</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/txt2img">
              <ListItemIcon>
                <Image
                  alt="txt2img"
                  src="/img/pages/txt2img.png"
                  width={25}
                  height={25}
                />
              </ListItemIcon>
              <ListItemText>
                <Trans>Text to Image</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/img2img">
              <ListItemIcon>
                <Image
                  alt="txt2img"
                  src="/img/pages/img2img.png"
                  width={25}
                  height={25}
                />
              </ListItemIcon>
              <ListItemText>
                <Trans>Image to Image</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/inpaint">
              <ListItemIcon>
                <Image
                  alt="txt2img"
                  src="/img/pages/inpaint.png"
                  width={25}
                  height={25}
                />
              </ListItemIcon>
              <ListItemText>
                <Trans>Inpainting</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/upsample">
              <ListItemIcon>
                <Image
                  alt="upsample"
                  src="/img/pages/upsample.png"
                  width={25}
                  height={25}
                />
              </ListItemIcon>
              <ListItemText>
                <Trans>Upsampling</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>{" "}
          <Divider />
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/credits">
              <ListItemIcon>
                <ConfirmationNumber />
              </ListItemIcon>
              <ListItemText>
                <Trans>Credits:</Trans> {userCredits}
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/resources">
              <ListItemIcon>
                <Bookmarks />
              </ListItemIcon>
              <ListItemText>
                <Trans>Resources</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/news">
              <ListItemIcon>
                <Newspaper />
              </ListItemIcon>
              <ListItemText>
                <Trans>News</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/stats">
              <ListItemIcon>
                <ShowChart />
              </ListItemIcon>
              <ListItemText>
                <Trans>Stats</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa"
            >
              <ListItemIcon>
                <GitHub />
              </ListItemIcon>
              <ListItemText>
                <Trans>GitHub</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/about">
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText>
                <Trans>About</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          {isAdmin ? (
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/admin">
                <ListItemIcon>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText>
                  <Trans>Admin</Trans>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ) : undefined}
        </List>
      </Box>
    ),
    [isAdmin, userCredits, toggleDrawer]
  );

  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const handleOpenUserMenu = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorElUser(event.currentTarget);
    },
    []
  );
  const handleCloseUserMenu = React.useCallback(() => {
    setAnchorElUser(null);
  }, []);

  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return React.useMemo(
    () => (
      <>
        {/*
          // Fixed height because of HideOnScroll, no longer position: static, so need
          // to create empty space at top of page that is usually covered.
      */}
        <Box sx={{ flexGrow: 1, height: "56px" }}>
          <HideOnScroll>
            <AppBar>
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
                        <Trans>Credits:</Trans> {userCredits}
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
          </HideOnScroll>

          <Box component="nav">
            <SwipeableDrawer
              swipeAreaWidth={15}
              hysteresis={0.3}
              disableBackdropTransition={!iOS}
              disableDiscovery={iOS}
              open={mobileOpen}
              onClose={toggleDrawer(false)}
              onOpen={toggleDrawer(true)}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
              sx={{
                // display: { xs: "block", sm: "none" },
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
        {/* 
      <div style={{ padding: 20, paddingBottom: 0 }}>
        <span style={{ color: "red" }}>
          +/- Sep 18th, sorry for breakages and slowness due to upstream
          provider issues.
        </span>{" "}
        Recent users get 30 free credits.
      </div>
        */}
      </>
    ),
    [
      anchorElLang,
      anchorElUser,
      asPath,
      drawer,
      iOS,
      mobileOpen,
      pathname,
      router,
      query,
      title,
      user,
      toggleDrawer,
      handleOpenUserMenu,
      handleCloseUserMenu,
      userCredits,
    ]
  );
}
