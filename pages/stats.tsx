import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import { useGongoSub, useGongoLive } from "gongo-client-react";
import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Box from "@mui/material/Box";
import { t, Trans } from "@lingui/macro";

import MyAppBar from "../src/MyAppBar";
import Link from "../src/Link";

const Stats: NextPage = () => {
  useGongoSub("statsDaily");

  const chartComponentRef = React.useRef<HighchartsReact.RefObject>(null);
  const statsDaily = useGongoLive((db) =>
    db
      .collection("statsDaily")
      .find({ date: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31) } })
  );

  const series = React.useMemo(() => {
    const series = {
      newUsers: [],
      totalUsers: [],
      newRequests: [],
      totalRequests: [],
    };
    for (const day of statsDaily) {
      // @ts-expect-error: TODO
      series.newUsers.push([day.date.getTime(), day.newUsers]);
      // @ts-expect-error: TODO
      series.totalUsers.push([day.date.getTime(), day.totalUsers]);
      // @ts-expect-error: TODO
      series.newRequests.push([day.date.getTime(), day.newRequests]);
      // @ts-expect-error: TODO
      series.totalRequests.push([day.date.getTime(), day.totalRequests]);
    }
    // console.log(series);
    return series;
  }, [statsDaily]);

  const defaults = Highcharts.getOptions();

  return (
    <>
      <MyAppBar title={t`Stats`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Box>
          <Trans>
            As a fully open source project, we&apos;re excited to have total
            transparancy and share this data with you. Get involved now on our{" "}
            <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa">
              GitHub!
            </a>
          </Trans>
        </Box>
        <br />
        <HighchartsReact
          highcharts={Highcharts}
          ref={chartComponentRef}
          options={{
            title: {
              text: t`Requests` + " (" + t`Last 30 days` + ")",
            },
            chart: {
              marginLeft: 25,
              marginRight: 25,
              alignTicks: false,
            },
            credits: {
              enabled: false,
            },
            tooltip: {
              shared: true,
            },
            legend: {
              align: "left",
              x: 40,
              verticalAlign: "top",
              y: 60,
              floating: true,
              backgroundColor:
                // @ts-expect-error: blah
                defaults.backgroundColor || // theme
                "rgba(255,255,255,0.25)",
            },
            xAxis: {
              type: "datetime",
            },
            yAxis: [
              {
                // left y axis
                title: {
                  text: null, // "Total Users",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[1],
                  },
                },
                labels: {
                  align: "left",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[1],
                  },
                },
                showFirstLabel: false,
              },
              {
                // right y axis
                gridLineWidth: 0,
                opposite: true,
                title: {
                  text: null, // "New Users",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[0],
                  },
                },
                labels: {
                  align: "right",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[0],
                  },
                },
                showFirstLabel: false,
              },
            ],
            series: [
              {
                name: t`New Requests`,
                type: "column",
                yAxis: 1,
                data: series.newRequests,
              },
              {
                name: t`Total Requests`,
                type: "line",
                data: series.totalRequests,
              },
            ],
          }}
        />
        <br />
        <HighchartsReact
          highcharts={Highcharts}
          ref={chartComponentRef}
          options={{
            title: {
              text: t`Users` + " (" + t`Last 30 days` + ")",
            },
            chart: {
              marginLeft: 25,
              marginRight: 25,
              alignTicks: false,
            },
            credits: {
              enabled: false,
            },
            tooltip: {
              shared: true,
            },
            legend: {
              align: "left",
              x: 40,
              verticalAlign: "top",
              y: 60,
              floating: true,
              backgroundColor:
                // @ts-expect-error: blah
                defaults.backgroundColor || // theme
                "rgba(255,255,255,0.25)",
            },
            xAxis: {
              type: "datetime",
            },
            yAxis: [
              {
                // left y axis
                title: {
                  text: null, // "Total Users",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[1],
                  },
                },
                labels: {
                  align: "left",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[1],
                  },
                },
                showFirstLabel: false,
              },
              {
                // right y axis
                gridLineWidth: 0,
                opposite: true,
                title: {
                  text: null, // "New Users",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[0],
                  },
                },
                labels: {
                  align: "right",
                  style: {
                    // @ts-expect-error: blah
                    color: Highcharts.getOptions().colors[0],
                  },
                },
                showFirstLabel: false,
              },
            ],
            series: [
              {
                name: t`New Users`,
                type: "column",
                yAxis: 1,
                data: series.newUsers,
              },
              {
                name: t`Total Users`,
                type: "line",
                data: series.totalUsers,
              },
            ],
          }}
        />

        <p>
          Coming soon: request times (fastest, average, slowest) over time, and
          data per model
        </p>

        <p>
          <Trans>
            Our <Link href="/logs">event logs</Link> are also available.
          </Trans>
        </p>

        <br />
      </Container>
    </>
  );
};

export default Stats;
