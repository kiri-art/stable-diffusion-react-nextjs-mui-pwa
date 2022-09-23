import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import { t } from "@lingui/macro";
import { db, useGongoSub, useGongoLive } from "gongo-client-react";
// import { format } from "date-fns";

import {
  Box,
  IconButton,
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
import { BananaRequest } from "../src/schemas";
import { Info } from "@mui/icons-material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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

function ByContainerRow({
  csends,
  info,
  marginBottom = 30,
}: {
  csends: CSend[];
  info: PayloadInitStart;
  marginBottom?: number;
}) {
  return (
    <div style={{ marginBottom: marginBottom }}>
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
              {csends.map((csend) => (
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
                  <TableCell align="right">{nf.format(csend.tsl)} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
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
      if (csend.status === "done") container.unshift(csend);

      if (csend.type === "init" && csend.status === "start")
        initInfo[cid] = csend.payload as PayloadInitStart;
    }
    return [byContainer, initInfo];
  }, [csends]);

  return (
    <div>
      {Object.entries(byContainer).map(([cid, entries]) => (
        <ByContainerRow key={cid} csends={entries} info={initInfo[cid]} />
      ))}
    </div>
  );
}

function _ContainerEvents({ csends }: { csends: CSend[] }) {
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

function RequestRowContainer({ request }: { request: BananaRequest }) {
  const CSends = db.collection("csends");
  const inferStart = CSends.findOne({
    // Can be useful to switch these during dev
    "payload.startRequestId": request.startRequestId,
    // "payload.startRequestId": null,
  });
  const containerId = inferStart && inferStart.container_id;

  if (!containerId) return <div>Could not find container info</div>;

  let initStart: CSend | undefined;

  const csends = CSends.find({ container_id: containerId })
    .toArraySync()
    .filter((csend) => {
      if (csend.type === "init" && csend.status === "start") initStart = csend;
      else if (csend.status === "done") return true;
      return false;
    });

  if (!initStart) return <div>Missing init_start</div>;

  const startToInit = initStart.date.getTime() - request.createdAt.getTime();

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableBody>
            <TableRow
              sx={{ background: startToInit > 15000 ? "#faa" : undefined }}
            >
              <TableCell>
                Request <code>start()</code> until container <code>init()</code>{" "}
                called:
              </TableCell>
              <TableCell align="right">
                {nf.format(startToInit / 1000)}s
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <div style={{ height: "6px" }} />
      <ByContainerRow
        csends={csends}
        info={initStart.payload as PayloadInitStart}
        marginBottom={5}
      />
    </Box>
  );
}

function RequestRow({ request }: { request: BananaRequest }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TableRow
        sx={{
          "&:last-child td, &:last-child th": { border: 0 },
          background:
            request.totalTime && request.totalTime > 60000
              ? "#faaa"
              : undefined,
        }}
      >
        <TableCell align="left">
          {request.createdAt.toLocaleTimeString()}
          <IconButton
            onClick={() => setOpen(!open)}
            sx={{ opacity: open ? 1 : 0.3 }}
          >
            <Info />
          </IconButton>
        </TableCell>
        <TableCell align="right">
          {request.totalTime
            ? nf.format(Math.round(request.totalTime / 1000)) + " s"
            : request.message}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={2}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>{request.callInputs.MODEL_ID}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pipeline</TableCell>
                    <TableCell>{request.callInputs.PIPELINE}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Scheduler</TableCell>
                    <TableCell>{request.callInputs.SCHEDULER}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>CallID</TableCell>
                    <TableCell>{request.callID}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <RequestRowContainer request={request} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function Requests() {
  useGongoSub("bananaRequests");

  const requests = useGongoLive((db) =>
    db.collection("bananaRequests").find().sort("createdAt", "desc")
  );

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table
          aria-label="simple table"
          // size="small"
          sx={{ tableLayout: "fixed" }}
        >
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
            {requests.map((request) => (
              <RequestRow key={request._id} request={request} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

const Logs: NextPage = () => {
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
            <Tab label="Requests" />
            <Tab label="Containers" />
            {/* <Tab label="C_Events" /> */}
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <Requests />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ByContainer csends={csends} />
        </TabPanel>
        {/*
        <TabPanel value={value} index={1}>
          <ContainerEvents csends={csends} />
        </TabPanel>
        */}
      </Container>
    </>
  );
};

export default Logs;
