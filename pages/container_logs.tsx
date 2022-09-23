import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import { t } from "@lingui/macro";
import { useGongoSub, useGongoLive } from "gongo-client-react";
// import { format } from "date-fns";

import {
  Box,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import type { CSend, PayloadInitStart } from "../src/schemas/csend";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const nf = new Intl.NumberFormat();

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Chip({ type: _type, children }: { type: string; children: string }) {
  return (
    <div
      style={{
        display: "inline-block",
        borderRadius: 5,
        padding: "5px 10px 5px 10px",
        background: "#ddd",
        marginRight: 2,
        marginTop: 2,
        marginBottom: 2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function ByContainer({ csends }: { csends: CSend[] }) {
  const [byContainer, initInfo] = React.useMemo(() => {
    const byContainer: Record<string, CSend[]> = {};
    const initInfo: Record<string, PayloadInitStart> = {};

    for (const csend of csends) {
      const cid = csend.container_id;
      const container = byContainer[cid] || (byContainer[cid] = []);
      if (csend.status === "done") container.push(csend);

      if (csend.type === "init" && csend.status === "start")
        initInfo[cid] = csend.payload as PayloadInitStart;
    }
    return [byContainer, initInfo];
  }, [csends]);

  return (
    <div>
      {Object.entries(byContainer).map(([cid, entries]) => {
        const info = initInfo[cid];
        return (
          <div key={cid} style={{ marginBottom: 30 }}>
            <div style={{ marginBottom: 10, maxWidth: "100%" }}>
              <Chip type="model_id">{info.model_id}</Chip>{" "}
              <Chip type="device">{info.device}</Chip>{" "}
              <Chip type="hostname">{info.hostname}</Chip>
            </div>
            <div>
              <TableContainer component={Paper}>
                <Table aria-label="simple table">
                  {/* 
                  <TableHead>
                    <TableRow>
                      <TableCell align="left" width={120}>
                        Date
                      </TableCell>
                      <TableCell align="center">Type</TableCell>
                      <TableCell align="right">TSL (ms)</TableCell>
                    </TableRow>
                  </TableHead>
                  */}
                  <TableBody>
                    {entries.map((csend) => (
                      <TableRow
                        key={csend._id}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell align="left">
                          {csend.date.toLocaleTimeString()}
                        </TableCell>
                        <TableCell align="center">{csend.type}</TableCell>
                        <TableCell align="right">
                          {nf.format(csend.tsl)} ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogEntries({ csends }: { csends: CSend[] }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="left" width={120}>
              Date
            </TableCell>
            <TableCell align="center">Type</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right">TSL (ms)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {csends.map((csend) => (
            <React.Fragment key={csend._id}>
              <TableRow
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell align="left">
                  {csend.date.toLocaleTimeString()}
                </TableCell>
                <TableCell align="center">{csend.type}</TableCell>
                <TableCell align="center">{csend.status}</TableCell>
                <TableCell align="right">{csend.tsl}</TableCell>
              </TableRow>
              {csend.type === "init" && csend.status === "start" ? (
                <TableRow
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell></TableCell>
                  <TableCell align="center">{csend.payload.device}</TableCell>
                  <TableCell align="center">{csend.payload.model_id}</TableCell>
                  <TableCell align="right">{csend.payload.hostname}</TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const ContainerLogs: NextPage = () => {
  useGongoSub("csends");

  const csends = useGongoLive((db) =>
    db.collection("csends").find().sort("date", "desc")
  );

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <MyAppBar title={t`Stats`} />
      <Container maxWidth="lg">
        <br />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="By Container" />
            <Tab label="Log Entries" />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <ByContainer csends={csends} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <LogEntries csends={csends} />
        </TabPanel>
      </Container>
    </>
  );
};

export default ContainerLogs;
