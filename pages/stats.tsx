import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import { t } from "@lingui/macro";
import { useGongoSub, useGongoLive } from "gongo-client-react";
import { format } from "date-fns";

import MyAppBar from "../src/MyAppBar";

const Stats: NextPage = () => {
  useGongoSub("statsDaily");

  const statsDaily = useGongoLive((db) => db.collection("statsDaily").find());

  return (
    <>
      <MyAppBar title={t`Stats`} />
      <Container maxWidth="lg">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>New Users</th>
              <th>Total Users</th>
              <th>New Requests</th>
              <th>Total Requests</th>
            </tr>
          </thead>
          <tbody>
            {statsDaily.map((day) => (
              <tr key={day._id}>
                <td>{format(day.date as Date, "yyyy-MM-dd")}</td>
                {/* @ts-expect-error: TODO */}
                <td>{day.newUsers}</td>
                {/* @ts-expect-error: TODO */}
                <td>{day.totalUsers}</td>
                {/* @ts-expect-error: TODO */}
                <td>{day.newRequests}</td>
                {/* @ts-expect-error: TODO */}
                <td>{day.totalRequests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Container>
    </>
  );
};

export default Stats;
