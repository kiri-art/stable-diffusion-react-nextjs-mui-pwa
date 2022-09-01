# stable-diffusion-react-nextjs-mui-pwa

_PWA Web App front end for Stable Diffusion, on React/NextJS with Material UI_

Copyright (c) 2022 by Gadi Cohen <dragon@wastelands.net>. MIT Licensed.

## WIP - just started. Only use if you want to help :)

- Web interface to run Stable Diffusion queries on:
  - Local PC / local installation
  - [Banana.dev](https://banana.dev) serverless GPU containers (roughly $1 = 200 requests, YMMV)
  - Local banana.dev docker container (see [docs/banana-local.md](./docs/banana-local.md))
  - Others?

Why? Make this fun stuff more accessible to web developers and friends :)

If you have a background in web dev / dev ops, and have wanted to experiment a bit with machine learning / latent diffusion (AI image generation), this is a great project to get involved in :)

Doing this in my very limited spare time, PRs more likely to get responses than issues, but try me :)

![a super happy developer typing away on her computer, anime style](./docs/img/cover.png)

## To Develop

1. Clone repo
1. `yarn install`
1. ~~edit `.env.local`~~ (or just set local vars - per below)
1. `yarn dev`

Note: you'll need at least one destination / target from the list below where Stable Diffusion will run.

## Destinations / Targets

- **Local Exec**

  - If you already have Stable Diffusion installed locally,
    this will run the Python script via node spawn.
    Set `STABLE_DIFFUSION_HOME` (to e.g. `/home/user/src/stable-diffusion`).

- **Local BananaDev docker image**

  - Pretty easy if you have docker installed.
    See (see [docs/banana-local.md](./docs/banana-local.md)).

- **Remote BananaDev container (serverless GPU)**

  - Great for local dev if you don't have a supported GPU
  - Default for deployments or when `NODE_ENV=="production"`
  - I'm paying roughly $1 = 200 requests with default params, YMMV.
  - Follow instructions at https://github.com/bananaml/serverless-template-stable-diffusion.
  - Set BANANA_API_KEY and BANANA_MODEL_KEY env variables.

## TODO

- Docker image for super easy start
- Vercel clone button

## i18n

We use NextJS's built-in
[i18n routing](https://nextjs.org/docs/advanced-features/i18n-routing) and
[Lingui](https://lingui.js.org/tutorials/setup-react.html) for translations.

Useful commands:

- `yarn i18n:extract` to extract strings.
- Send `locales/*/messages.po` to translators, resave.
- `yarn i18n:compile` before deploy.

See also [lingui.config.js](./lingui.config.js) and [locales](./locales) dir.

## Refs

- https://github.com/mui/material-ui/tree/master/examples/nextjs-with-typescript
-
